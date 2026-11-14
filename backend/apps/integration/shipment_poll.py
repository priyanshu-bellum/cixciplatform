"""Durable shipment polling — reads vendor shipment feeds and updates tracking."""
import hashlib
import json
from datetime import timedelta
from uuid import uuid4
from django.db import transaction
from django.utils import timezone
from .commerce_models import VendorCommerceProfile, VendorCommercePollRun, SupplierOrderDispatch
from .catalog_transport import fetch_json, CatalogTransportError
from .catalog_config import path_value
from .catalog_sync import _reserve_request, audit
from .order_dispatch import origin_url, profile_transport


MAX_PAGES = 50
MAX_ROWS_PER_PAGE = 500


def publish_poll(poll_id, delay=0):
    from config.celery import app
    try:
        app.send_task('integration.vendor_commerce.poll_shipments',
                       args=[str(poll_id)], queue='vendor_commerce',
                       countdown=max(0, delay), retry=False)
    except Exception:
        VendorCommercePollRun.objects.filter(pk=poll_id, status__in=['queued', 'retrying']).update(
            error_code='QUEUE_UNAVAILABLE')


@transaction.atomic
def request_shipment_poll(profile_id, *, actor=None):
    profile = VendorCommerceProfile.objects.select_for_update().select_related(
        'connection__vendor_company'
    ).get(pk=profile_id, polling_enabled=True)

    existing = VendorCommercePollRun.objects.filter(
        profile=profile, kind='shipments', status__in=['queued', 'running', 'retrying']
    ).first()
    if existing:
        return existing

    run = VendorCommercePollRun.objects.create(
        profile=profile,
        kind='shipments',
        status='queued',
        config_version=profile.config_version,
        config_snapshot=profile.config.get('shipments', {}),
        watermark=_last_watermark(profile),
    )
    audit('shipment_poll_queued', profile.connection, actor,
          poll_id=str(run.pk), profile_id=str(profile.pk))
    transaction.on_commit(lambda: publish_poll(run.pk))
    return run


def _last_watermark(profile):
    last = VendorCommercePollRun.objects.filter(
        profile=profile, kind='shipments', status='completed'
    ).order_by('-completed_at').values_list('watermark', flat=True).first()
    return last or ''


def process_shipment_poll(poll_id):
    with transaction.atomic():
        run = VendorCommercePollRun.objects.select_for_update(of=('self',)).select_related(
            'profile__connection__vendor_company', 'profile__updated_by'
        ).get(pk=poll_id)
        now = timezone.now()
        if run.status not in ('queued', 'retrying', 'running'):
            return
        if run.status == 'retrying' and run.next_retry_at and run.next_retry_at > now:
            return
        token = uuid4()
        run.status = 'running'
        run.lease_token = token
        run.lease_expires_at = now + timedelta(minutes=5)
        run.attempt_count += 1
        run.save()

    profile = run.profile
    cfg = run.config_snapshot
    try:
        if (not profile.polling_enabled or profile.connection.is_retired
                or profile.connection.vendor_company.status != 'active'):
            raise ValueError('Polling configuration is unavailable.')

        cursor = run.cursor
        for _ in range(MAX_PAGES):
            params = {}
            if cursor:
                params[cfg.get('cursor_param', 'cursor')] = cursor
            if run.watermark:
                params[cfg.get('updated_since_param', 'updated_since')] = run.watermark

            transport = profile_transport(profile, cfg.get('path', '/shipments'))
            _reserve_request(profile.connection, catalog_rows=False)
            response = fetch_json(transport, params)

            items_path = cfg.get('items_path', 'data.shipments')
            items = path_value(response, items_path)
            if not isinstance(items, list):
                break

            cursor_hash = hashlib.sha256(json.dumps(items, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            if cursor_hash in (run.cursor_hashes or []):
                break

            for item in items[:MAX_ROWS_PER_PAGE]:
                _process_shipment_row(item, profile, cfg, run)
                run.rows_seen += 1

            with transaction.atomic():
                current = VendorCommercePollRun.objects.select_for_update().get(pk=run.pk)
                if current.lease_token != token:
                    return
                current.rows_seen = run.rows_seen
                current.processed_count = run.processed_count
                current.page_index += 1
                hashes = current.cursor_hashes or []
                hashes.append(cursor_hash)
                current.cursor_hashes = hashes[-MAX_PAGES:]
                next_cursor = path_value(response, cfg.get('next_cursor_path', 'data.next_cursor'))
                next_watermark = path_value(response, cfg.get('watermark_path', 'data.next_updated_since'))
                current.cursor = next_cursor if next_cursor else None
                if next_watermark:
                    current.watermark = str(next_watermark)[:100]
                current.save()

            if not path_value(response, cfg.get('next_cursor_path', 'data.next_cursor')):
                break
            cursor = path_value(response, cfg.get('next_cursor_path', 'data.next_cursor'))

        with transaction.atomic():
            current = VendorCommercePollRun.objects.select_for_update().get(pk=run.pk)
            if current.lease_token != token:
                return
            current.status = 'completed'
            current.completed_at = timezone.now()
            current.lease_token = None
            current.lease_expires_at = None
            current.save()

        _schedule_next_poll(profile)
        audit('shipment_poll_completed', profile.connection, profile.updated_by,
              poll_id=str(run.pk), rows=run.rows_seen, processed=run.processed_count)

    except (CatalogTransportError, ValueError) as error:
        with transaction.atomic():
            current = VendorCommercePollRun.objects.select_for_update().get(pk=run.pk)
            if current.lease_token != token:
                return
            temporary = isinstance(error, CatalogTransportError) and (
                error.status == 429 or (error.status and error.status >= 500))
            if temporary and current.attempt_count < 5:
                delay = getattr(error, 'retry_after', None) or min(1800, 60 * 2 ** current.attempt_count)
                current.status = 'retrying'
                current.next_retry_at = timezone.now() + timedelta(seconds=delay)
                current.lease_token = None
                current.lease_expires_at = None
                current.save()
                transaction.on_commit(lambda: publish_poll(current.pk, delay))
            else:
                current.status = 'failed'
                current.error_code = (error.code if isinstance(error, CatalogTransportError)
                                      else str(error)[:100])
                current.completed_at = timezone.now()
                current.lease_token = None
                current.lease_expires_at = None
                current.save()
            audit('shipment_poll_failed', profile.connection, profile.updated_by,
                  poll_id=str(run.pk), error=current.error_code)


def _process_shipment_row(item, profile, cfg, run):
    if not isinstance(item, dict):
        return

    po_number = path_value(item, cfg.get('po_path', 'po_number'))
    external_order = path_value(item, cfg.get('external_order_path', 'order_number'))
    shipment_id = path_value(item, cfg.get('id_path', 'shipment_number'))
    raw_status = path_value(item, cfg.get('status_path', 'status'))
    shipped_at = path_value(item, cfg.get('shipped_at_path', 'ship_date'))
    delivered_at = path_value(item, cfg.get('delivered_at_path', 'delivered_date'))

    tracking = path_value(item, cfg.get('tracking_path', 'tracking')) or {}
    tracking_number = path_value(tracking, cfg.get('tracking_number_path', 'number')) if isinstance(tracking, dict) else None
    carrier = path_value(tracking, cfg.get('carrier_path', 'carrier')) if isinstance(tracking, dict) else None

    dispatch = _find_dispatch(profile, po_number, external_order)
    if not dispatch:
        run.review_count += 1
        return

    status_map = cfg.get('status_map', {})
    normalized = status_map.get(str(raw_status), '') if raw_status else ''

    with transaction.atomic():
        from apps.fulfillment.models import FulfillmentHandoff
        handoff = FulfillmentHandoff.objects.select_for_update().filter(
            routed_suborder_reference=dispatch.suborder_id
        ).first()
        if not handoff:
            run.review_count += 1
            return

        changed = False
        if tracking_number and tracking_number != handoff.tracking_number:
            handoff.tracking_number = str(tracking_number)[:255]
            changed = True
        if carrier and carrier != handoff.shipping_carrier:
            handoff.shipping_carrier = str(carrier)[:255]
            changed = True
        if external_order and not handoff.vendor_order_number:
            handoff.vendor_order_number = str(external_order)[:255]
            changed = True

        if shipped_at and not handoff.shipped_date:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                d = parse_date(str(shipped_at)) if len(str(shipped_at)) <= 10 else None
                if not d:
                    dt = parse_datetime(str(shipped_at))
                    d = dt.date() if dt else None
                if d:
                    handoff.shipped_date = d
                    changed = True
            except (ValueError, TypeError):
                pass

        if delivered_at and not handoff.delivered_date:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                d = parse_date(str(delivered_at)) if len(str(delivered_at)) <= 10 else None
                if not d:
                    dt = parse_datetime(str(delivered_at))
                    d = dt.date() if dt else None
                if d:
                    handoff.delivered_date = d
                    changed = True
            except (ValueError, TypeError):
                pass

        if not handoff.tracking_source:
            handoff.tracking_source = "vendor_api"
            changed = True

        if normalized == 'shipped' and handoff.status in ('received', 'processing'):
            handoff.status = 'shipped'
            changed = True
        elif normalized == 'delivered' and handoff.status in ('received', 'processing', 'shipped'):
            handoff.status = 'delivered'
            changed = True
        elif normalized == 'exception':
            handoff.status = 'exception'
            changed = True

        if changed:
            handoff.save()
            current_dispatch = SupplierOrderDispatch.objects.select_for_update().get(pk=dispatch.pk)
            if normalized in ('shipped', 'delivered') and current_dispatch.status not in ('shipped', 'delivered', 'failed'):
                current_dispatch.status = normalized
                current_dispatch.provider_updated_at = timezone.now()
                current_dispatch.save()
            run.processed_count += 1

            if normalized == 'delivered':
                from .webhook_handlers import _check_parent_completeness
                _check_parent_completeness(handoff, dispatch)


def _find_dispatch(profile, po_number, external_order_id):
    qs = SupplierOrderDispatch.objects.filter(vendor_company=profile.vendor_company)
    if po_number:
        d = qs.filter(po_number=str(po_number)[:150]).first()
        if d:
            return d
    if external_order_id:
        d = qs.filter(external_order_id=str(external_order_id)[:200]).first()
        if d:
            return d
    return None


def _schedule_next_poll(profile):
    interval = profile.config.get('poll_interval_minutes', 15)
    profile.next_poll_at = timezone.now() + timedelta(minutes=interval)
    profile.save(update_fields=['next_poll_at'])
