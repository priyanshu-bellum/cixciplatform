"""Poll Balaji finance API endpoints — invoices, credit memos, payments, returns."""
from datetime import timedelta
from django.db import transaction, IntegrityError
from django.utils import timezone
from .commerce_models import VendorCommerceProfile, VendorFinanceRecord, VendorReturnRecord, VendorCommercePollRun
from .catalog_config import path_value
from .catalog_sync import _reserve_request, audit
from .order_dispatch import profile_transport
from .catalog_transport import request_json, CatalogTransportError

FINANCE_ENDPOINTS = {
    'invoice': '/api/v1/invoices',
    'credit_memo': '/api/v1/credit-memos',
    'payment': '/api/v1/payments',
    'return': '/api/v1/returns',
}

MAX_PAGES = 20


def request_finance_sync(profile_id, *, kind='invoice', actor=None):
    profile = VendorCommerceProfile.objects.select_related(
        'connection__vendor_company', 'updated_by',
    ).get(pk=profile_id)
    if not profile.order_enabled or profile.adapter != 'balaji':
        return None
    if kind not in FINANCE_ENDPOINTS:
        return None
    run, created = VendorCommercePollRun.objects.get_or_create(
        profile=profile, kind=f'finance_{kind}',
        status__in=['queued', 'running', 'retrying'],
        defaults={
            'config_version': profile.config_version,
            'config_snapshot': profile.config,
            'status': 'queued',
        },
    )
    if created:
        audit(f'finance_sync_{kind}_queued', profile.connection,
              actor or profile.updated_by, profile_id=str(profile.pk))
        from .tasks import process_finance_sync
        transaction.on_commit(lambda: process_finance_sync.delay(str(run.pk)))
    return run


def process_finance_poll(run_id):
    run = VendorCommercePollRun.objects.select_related(
        'profile__connection__vendor_company', 'profile__updated_by',
    ).get(pk=run_id)
    if run.status not in ('queued', 'retrying'):
        return

    profile = run.profile
    kind = run.kind.replace('finance_', '')
    if kind not in FINANCE_ENDPOINTS:
        run.status = 'failed'
        run.error_code = 'UNKNOWN_FINANCE_KIND'
        run.save(update_fields=['status', 'error_code'])
        return

    endpoint = FINANCE_ENDPOINTS[kind]

    run.status = 'running'
    run.attempt_count += 1
    run.save(update_fields=['status', 'attempt_count'])

    try:
        _reserve_request(profile.connection, catalog_rows=False)
        transport = profile_transport(profile, endpoint)
        params = {}
        if run.watermark:
            params['updated_since'] = run.watermark

        total_processed = 0
        pages = 0
        latest_updated = run.watermark or ''

        while pages < MAX_PAGES:
            if run.cursor:
                params['cursor'] = run.cursor.get('next', '')
            http_status, response = request_json(
                transport, params, method='GET', accepted_statuses=(200,))
            if not isinstance(response, dict):
                break

            items = response.get('data', {}).get(f'{kind}s', response.get('data', []))
            if not isinstance(items, list):
                items = []

            for item in items:
                if not isinstance(item, dict):
                    continue
                if kind == 'return':
                    _upsert_return(item, profile)
                else:
                    _upsert_finance(item, kind, profile)
                total_processed += 1
                item_updated = str(item.get('updated_at', ''))
                if item_updated > latest_updated:
                    latest_updated = item_updated

            next_cursor = response.get('data', {}).get('next_cursor', '')
            if not next_cursor:
                break
            run.cursor = {'next': next_cursor}
            params['cursor'] = next_cursor
            pages += 1

        run.status = 'completed'
        run.processed_count = total_processed
        run.watermark = latest_updated
        run.completed_at = timezone.now()
        run.cursor = None
        run.save()
        audit(f'finance_sync_{kind}_done', profile.connection, profile.updated_by,
              profile_id=str(profile.pk), processed=total_processed)

    except CatalogTransportError as exc:
        temporary = exc.status == 429 or (exc.status and exc.status >= 500)
        if temporary and run.attempt_count < 3:
            delay = exc.retry_after or min(900, 60 * 2 ** run.attempt_count)
            run.status = 'retrying'
            run.next_retry_at = timezone.now() + timedelta(seconds=delay)
            run.error_code = exc.code or 'TRANSPORT_ERROR'
            run.save()
            from .tasks import process_finance_sync
            process_finance_sync.apply_async(
                args=[str(run.pk)], countdown=delay, queue='vendor_commerce')
        else:
            run.status = 'failed'
            run.error_code = exc.code or 'TRANSPORT_ERROR'
            run.completed_at = timezone.now()
            run.save()

    except Exception as exc:
        run.status = 'failed'
        run.error_code = str(exc)[:100]
        run.completed_at = timezone.now()
        run.save()


def _upsert_finance(item, kind, profile):
    external_id = str(item.get('id', ''))
    if not external_id:
        return
    defaults = {
        'vendor_company': profile.vendor_company,
        'external_number': str(item.get('invoice_number') or item.get('number', ''))[:200],
        'status': str(item.get('status', ''))[:50],
        'total_cents': int(item.get('total_cents', 0) or 0),
        'amount_due_cents': int(item.get('amount_due_cents') or item.get('amount_remaining_cents') or 0),
        'currency': str(item.get('currency', 'USD'))[:3],
        'po_number': str(item.get('po_number', ''))[:150],
        'pdf_url': str(item.get('pdf_url', ''))[:1000],
        'raw_data': item,
        'source': 'api_sync',
    }
    for date_field in ('issued_on', 'due_on'):
        raw = item.get(date_field)
        if raw:
            try:
                from django.utils.dateparse import parse_date
                defaults[date_field] = parse_date(str(raw)[:10])
            except (ValueError, TypeError):
                pass
    try:
        VendorFinanceRecord.objects.update_or_create(
            profile=profile, record_type=kind, external_id=external_id[:200],
            defaults=defaults,
        )
    except IntegrityError:
        pass


def _upsert_return(item, profile):
    external_id = str(item.get('id', ''))
    if not external_id:
        return
    source_order = item.get('source_order', {})
    if not isinstance(source_order, dict):
        source_order = {}
    credit_memo = item.get('credit_memo', {})
    if not isinstance(credit_memo, dict):
        credit_memo = {}
    defaults = {
        'vendor_company': profile.vendor_company,
        'status': str(item.get('status', ''))[:50],
        'source_order_number': str(source_order.get('order_number', ''))[:200],
        'po_number': str(source_order.get('po_number', '') or item.get('po_number', ''))[:150],
        'total_cents': int(item.get('total_cents', 0) or 0),
        'currency': str(item.get('currency', 'USD'))[:3],
        'credit_memo_id': str(credit_memo.get('id', ''))[:200],
        'raw_data': item,
        'source': 'api_sync',
    }
    try:
        VendorReturnRecord.objects.update_or_create(
            profile=profile, external_id=external_id[:200],
            defaults=defaults,
        )
    except IntegrityError:
        pass


def dispatch_due_finance_syncs():
    profiles = VendorCommerceProfile.objects.filter(
        order_enabled=True, adapter='balaji',
        connection__is_retired=False,
        vendor_company__status='active',
    ).values_list('pk', flat=True)[:50]
    started = 0
    for profile_id in profiles:
        for kind in ('invoice', 'credit_memo', 'payment', 'return'):
            try:
                run = request_finance_sync(profile_id, kind=kind)
                if run:
                    started += 1
            except Exception:
                pass
    return started
