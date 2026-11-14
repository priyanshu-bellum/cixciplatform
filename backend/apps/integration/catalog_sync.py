"""Durable page-at-a-time catalog synchronization and weekly dispatch."""
from datetime import datetime, time, timedelta
from hashlib import sha256
import json
from urllib.parse import urlsplit
from uuid import uuid4
from zoneinfo import ZoneInfo
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.core.exceptions import ValidationError
from .catalog_config import saved_integration_mode, validate_config, path_value
from .catalog_transport import fetch_json, CatalogTransportError
from .models import VendorCatalogConnection, VendorCatalogSyncRun, VendorCatalogItem, VendorCatalogBudget

ACTIVE = ("queued", "running", "retrying")


def audit(event, connection, actor=None, *, status='success', **data):
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code="integration.vendor_catalog." + event, event_description=json.dumps(data, default=str),
        status=status, actor_reference=getattr(actor, "id", None), company_scope_reference=connection.vendor_company_id,
        source_module="integration", source_record_type="VendorCatalogConnection", source_record_id=connection.id)


def publish_job(run_id, delay=0):
    # send_task deliberately queues even when unrelated legacy tasks use eager mode.
    from config.celery import app
    try:
        app.send_task("integration.vendor_catalog.process_page", args=[str(run_id)], queue="vendor_catalog", countdown=max(0, delay), retry=False)
    except Exception:
        # The durable queued/retrying row is picked up by the dispatcher again.
        VendorCatalogSyncRun.objects.filter(pk=run_id, status__in=ACTIVE).update(error_code="QUEUE_UNAVAILABLE")


def _publish_after_commit(run_id, delay=0):
    transaction.on_commit(lambda: publish_job(run_id, delay))


@transaction.atomic
def request_sync(connection, actor=None, trigger="manual"):
    connection = VendorCatalogConnection.objects.select_for_update(of=("self",)).select_related("vendor_company").get(pk=connection.pk)
    if connection.is_retired or saved_integration_mode(connection.vendor_company) != "api":
        raise ValueError("Save the Vendor Company Profile in API Integration Mode before synchronizing.")
    if connection.vendor_company.company_type != "vendor" or connection.vendor_company.status in ("retired", "archived", "suspended"):
        raise ValueError("This Vendor is not available for synchronization.")
    validate_config(connection.config)
    existing = connection.sync_runs.filter(status__in=ACTIVE).first()
    if existing:
        return existing
    run = VendorCatalogSyncRun.objects.create(connection=connection, requested_by=actor, trigger=trigger, config_version=connection.config_version)
    audit("requested", connection, actor, run_id=run.id, trigger=trigger)
    _publish_after_commit(run.id)
    return run


def _reset_at(connection, now):
    zone = ZoneInfo(connection.config.get("budget_timezone", "UTC"))
    tomorrow = now.astimezone(zone).date() + timedelta(days=1)
    return datetime.combine(tomorrow, time(), tzinfo=zone)


@transaction.atomic
def _reserve_request(connection, *, catalog_rows=True):
    now = timezone.now()
    zone = ZoneInfo(connection.config.get("budget_timezone", "UTC"))
    budget, _ = VendorCatalogBudget.objects.get_or_create(vendor_company_id=connection.vendor_company_id,
        origin=urlsplit(connection.endpoint_url).hostname, day=now.astimezone(zone).date())
    budget = VendorCatalogBudget.objects.select_for_update().get(pk=budget.pk)
    cfg = connection.config
    if (catalog_rows and budget.rows + cfg["page_size"] > cfg["daily_row_limit"]) or budget.requests >= cfg["daily_request_limit"]:
        raise CatalogTransportError("DAILY_BUDGET_REACHED", status=429, retry_after=int((_reset_at(connection, now) - now).total_seconds()))
    if now >= budget.window_started_at + timedelta(minutes=1):
        budget.window_started_at, budget.window_requests = now, 0
    if budget.window_requests >= cfg["requests_per_minute"]:
        raise CatalogTransportError("REQUEST_BUDGET_REACHED", status=429, retry_after=max(1, int((budget.window_started_at + timedelta(minutes=1) - now).total_seconds())))
    budget.requests += 1; budget.window_requests += 1
    budget.save(update_fields=["requests", "window_requests", "window_started_at"])
    return budget.pk


def catalog_request_params(config, cursor=None, *, limit=None):
    params = {config['limit_param']: config['page_size'] if limit is None else limit}
    mode = config['pagination']
    if mode == 'cursor' and cursor is not None:
        params[config['cursor_param']] = cursor
    elif mode == 'page':
        params[config.get('page_param', 'page')] = int(cursor or 1)
    elif mode == 'offset':
        params[config.get('offset_param', 'offset')] = int(cursor or 0)
    return params


def test_catalog_connection(connection, actor):
    """Bounded authenticated preview, not a successful catalog import."""
    if (connection.is_retired or saved_integration_mode(connection.vendor_company) != 'api'
            or connection.vendor_company.status in ('retired', 'archived', 'suspended')):
        raise ValidationError('Save an available Vendor in API mode before testing.')
    config = validate_config(connection.config)
    limit = min(3, config['page_size'])
    budget_id = _reserve_request(connection)
    try:
        payload = fetch_json(connection, catalog_request_params(config, limit=limit))
        if config.get('success_path') and path_value(payload, config['success_path']) is not True:
            raise CatalogTransportError('PROVIDER_REPORTED_FAILURE')
        items = path_value(payload, config['items_path'])
        if not isinstance(items, list) or len(items) > limit or any(not isinstance(item, dict) for item in items):
            raise CatalogTransportError('INVALID_PAGE_SHAPE')
        from django.db.models import F
        VendorCatalogBudget.objects.filter(pk=budget_id).update(rows=F('rows') + len(items))
        from .catalog_import import mapped_values
        from .catalog_secrets import decrypt_credentials, redact
        secrets = list(decrypt_credentials(connection).values())
        samples = []
        for item in items:
            fields, _ = mapped_values(redact(item, secrets), config)
            samples.append({key: str(fields[key])[:200] for key in ('sku', 'name', 'brand') if key in fields})
        audit('connection_tested', connection, actor, sample_count=len(items), http_status=200)
        return {'http_status': 200, 'sample_count': len(items), 'samples': samples, 'imported_count': 0,
                'detail': 'Connection succeeded. Preview only; use Sync Now to import. Missing required Product data remains in review.'}
    except CatalogTransportError as error:
        audit('connection_test_failed', connection, actor, status='failure', code=error.code)
        raise


def _page(connection, run):
    if run.trigger == "review":
        query = connection.source_items.filter(review_required=True).order_by("pk")
        if run.page_cursor:
            query = query.filter(pk__gt=run.page_cursor)
        rows = list(query[:connection.config["page_size"] + 1])
        next_cursor = str(rows[-2].pk) if len(rows) > connection.config["page_size"] else None
        return [row.payload for row in rows[:connection.config["page_size"]]], next_cursor, None
    cfg = connection.config
    params = catalog_request_params(cfg, run.page_cursor)
    mode = cfg["pagination"]
    budget_id = _reserve_request(connection)
    payload = fetch_json(connection, params)
    if cfg.get("success_path") and path_value(payload, cfg["success_path"]) is not True:
        raise CatalogTransportError("PROVIDER_REPORTED_FAILURE")
    items = path_value(payload, cfg["items_path"])
    if not isinstance(items, list) or len(items) > cfg["page_size"] or any(not isinstance(item, dict) for item in items):
        raise CatalogTransportError("INVALID_PAGE_SHAPE")
    from django.db.models import F
    VendorCatalogBudget.objects.filter(pk=budget_id).update(rows=F("rows") + len(items))
    if mode == "cursor":
        missing = object()
        next_cursor = path_value(payload, cfg["next_cursor_path"], missing)
        if next_cursor is missing or (next_cursor is not None and (not isinstance(next_cursor, (str, int)) or isinstance(next_cursor, bool) or not str(next_cursor) or len(str(next_cursor)) > 4096)):
            raise CatalogTransportError("INVALID_PAGINATION")
    elif mode in ("page", "offset"):
        has_more = path_value(payload, cfg["has_more_path"])
        if type(has_more) is not bool:
            raise CatalogTransportError("INVALID_PAGINATION")
        next_cursor = (int(run.page_cursor or (1 if mode == "page" else 0)) + (1 if mode == "page" else cfg["page_size"])) if has_more else None
    else:
        next_cursor = None
    watermark = path_value(payload, cfg.get("watermark_path", "")) if cfg.get("watermark_path") else None
    if watermark is not None:
        try:
            parsed = parse_datetime(watermark) if isinstance(watermark, str) else None
            if not parsed or timezone.is_naive(parsed):
                raise ValueError()
        except (ValueError, TypeError):
            raise CatalogTransportError("INVALID_WATERMARK")
    return items, next_cursor, watermark


def _fail(run_id, token, error):
    with transaction.atomic():
        run = VendorCatalogSyncRun.objects.select_for_update().get(pk=run_id)
        if run.lease_token != token or run.status != "running":
            return
        now = timezone.now()
        temporary = error.status == 429 or (error.status is not None and error.status >= 500)
        if temporary and (run.attempt_count < 5 or error.status == 429):
            delay = error.retry_after or min(3600, 30 * 2 ** min(run.attempt_count, 6))
            run.status, run.next_retry_at = "retrying", now + timedelta(seconds=delay)
            _publish_after_commit(run.id, delay)
        else:
            run.status, run.completed_at = "failed", now
        run.error_code = error.code
        run.lease_token, run.lease_expires_at = None, None
        run.save()
        VendorCatalogConnection.objects.filter(pk=run.connection_id).update(last_error_code=error.code)
        audit("page_failed", run.connection, run.requested_by, run_id=run.id, code=error.code, retry_at=run.next_retry_at)


def process_sync_page(run_id):
    connection_id = VendorCatalogSyncRun.objects.only("connection_id").get(pk=run_id).connection_id
    with transaction.atomic():
        connection = VendorCatalogConnection.objects.select_for_update(of=("self",)).select_related("vendor_company", "updated_by").get(pk=connection_id)
        run = VendorCatalogSyncRun.objects.select_for_update().get(pk=run_id)
        now = timezone.now()
        if run.status not in ACTIVE or (run.next_retry_at and run.next_retry_at > now) or (run.status == "running" and run.lease_expires_at and run.lease_expires_at > now):
            return
        if connection.is_retired or connection.vendor_company.company_type != 'vendor' or connection.vendor_company.status in ('retired', 'archived', 'suspended') or saved_integration_mode(connection.vendor_company) != "api" or connection.config_version != run.config_version:
            run.status, run.error_code, run.completed_at = "cancelled", "CONNECTION_CHANGED", now
            run.save(); return
        token = uuid4()
        run.status, run.lease_token, run.lease_expires_at = "running", token, now + timedelta(minutes=3)
        run.started_at = run.started_at or now
        run.attempt_count += 1
        run.save()
    try:
        actor = run.requested_by or connection.updated_by
        if not actor or not actor.is_active or not actor.is_cixci_admin:
            raise CatalogTransportError("CONFIGURING_ADMIN_REQUIRED")
        items, next_cursor, watermark = _page(connection, run)
        if next_cursor is not None:
            cursor_hash = sha256(str(next_cursor).encode()).hexdigest()
            if cursor_hash in run.cursor_hashes or run.page_index >= 999:
                raise CatalogTransportError("PAGINATION_LOOP")
        else:
            cursor_hash = None
        with transaction.atomic():
            current = VendorCatalogConnection.objects.select_for_update(of=("self",)).select_related("vendor_company").get(pk=connection_id)
            run = VendorCatalogSyncRun.objects.select_for_update().get(pk=run_id)
            if run.status != "running" or run.lease_token != token:
                return
            if current.config_version != run.config_version or current.vendor_company.company_type != 'vendor' or current.vendor_company.status in ('retired', 'archived', 'suspended') or saved_integration_mode(current.vendor_company) != "api" or current.is_retired:
                run.status, run.error_code, run.completed_at = "cancelled", "CONNECTION_CHANGED", timezone.now()
                run.save(); return
            from .catalog_import import ingest_rows
            from apps.catalog.services import defer_buyer_projection_refresh
            with defer_buyer_projection_refresh():
                counts = ingest_rows(current, run, items, actor)
            for name, value in counts.items():
                setattr(run, name, getattr(run, name) + value)
            run.rows_seen += len(items); run.page_index += 1
            run.page_cursor = next_cursor
            run.attempt_count, run.next_retry_at, run.error_code = 0, None, ""
            run.lease_token, run.lease_expires_at = None, None
            if cursor_hash:
                run.cursor_hashes = [*run.cursor_hashes, cursor_hash]
                run.status = "queued"
                _publish_after_commit(run.id)
            else:
                run.status, run.completed_at = "completed", timezone.now()
                if run.trigger != "review":
                    if not run.error_count:
                        current.source_items.exclude(last_seen_run=run).update(is_listed=False)
                    current.last_synced_at = run.completed_at
                    if not run.error_count:
                        current.last_watermark = watermark or current.last_watermark
                    current.next_sync_at = run.completed_at + timedelta(days=7) if current.schedule_enabled else None
                    current.last_error_code = ""
                    current.save(update_fields=["last_synced_at", "last_watermark", "next_sync_at", "last_error_code", "updated_at"])
                audit("completed", current, actor, run_id=run.id, rows=run.rows_seen, created=run.created_count, updated=run.updated_count, review=run.review_count)
            run.save()
            # One bulk invalidation per page; source Product and completed history are untouched.
            from apps.catalog.models import BuyerScopedCompatibilityProjection
            BuyerScopedCompatibilityProjection.objects.exclude(status="review_required").update(status="review_required", review_required_reason="vendor_catalog_sync")
    except CatalogTransportError as error:
        _fail(run_id, token, error)
    except ValidationError:
        _fail(run_id, token, CatalogTransportError("CONFIGURATION_REQUIRED"))
    except Exception:
        _fail(run_id, token, CatalogTransportError("PAGE_IMPORT_FAILED", status=503))


def dispatch_due_syncs():
    now = timezone.now()
    queued = 0
    due = VendorCatalogConnection.objects.filter(schedule_enabled=True, is_retired=False, next_sync_at__lte=now).select_related("vendor_company")
    for connection in due.iterator(chunk_size=100):
        if saved_integration_mode(connection.vendor_company) != "api" or connection.sync_runs.filter(status__in=ACTIVE).exists():
            continue
        try:
            request_sync(connection, trigger="weekly"); queued += 1
        except (ValidationError, ValueError):
            continue
    from django.db.models import Q
    pending = VendorCatalogSyncRun.objects.filter(Q(status="queued") | Q(status="retrying", next_retry_at__lte=now) | Q(status="running", lease_expires_at__lte=now))
    for identifier in pending.values_list("id", flat=True).iterator(chunk_size=100):
        publish_job(identifier)
    return {"queued": queued}
