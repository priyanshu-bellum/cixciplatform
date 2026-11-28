"""Canonical shipment progress.

Every source of shipment truth — vendor CSV upload, a vendor API webhook or
poll, and the carrier tracking provider — reports here, so the handoff, its
suborder, the parent order and the buyer signals always move together.

Rules:
- A shipment never moves backwards: delivered stays delivered.
- The carrier is the authority for transit and delivery once it reports.
- Database work and provider calls never share a transaction.
"""
import hashlib
import logging
import re
from datetime import timedelta

from django.db import IntegrityError, connection, transaction
from django.db.models import Q
from django.utils import timezone

from .easypost import (
    EasyPostError, TERMINAL_STATUSES, create_tracker, normalize_tracker, retrieve_tracker,
)
from .models import (
    BuyerSignalStatus, BuyerUpdateKind, BuyerUpdateReadySignal, CarrierTrackingConfig, CarrierWebhookReceipt,
    FulfillmentHandoff, ShipmentTracker, ShipmentTrackingEvent, TrackerState,
)

logger = logging.getLogger(__name__)

PROVIDER = "easypost"
IN_MOTION = ("in_transit", "out_for_delivery", "available_for_pickup")
PROBLEM = ("return_to_sender", "failure", "cancelled", "error")
STATUS_LABELS = {
    "unknown": "Awaiting carrier scan", "pre_transit": "Label created", "in_transit": "In transit",
    "out_for_delivery": "Out for delivery", "delivered": "Delivered", "available_for_pickup": "Available for pickup",
    "return_to_sender": "Returned to sender", "failure": "Delivery failed", "cancelled": "Cancelled", "error": "Tracking error",
}
CLAIM_MINUTES = 15
MAX_TRACKING_DAYS = 60
MAX_REGISTRATION_ATTEMPTS = 6


# ─── Configuration and secrets ────────────────────────────────────────────────

def tracking_config():
    return CarrierTrackingConfig.objects.filter(provider=PROVIDER).first()


def seal(value):
    from apps.integration.catalog_secrets import key_ring
    return key_ring().encrypt(value.encode()).decode()


def unseal(value):
    if not value:
        return ""
    from apps.integration.catalog_secrets import key_ring
    from cryptography.fernet import InvalidToken
    from django.core.exceptions import ValidationError
    try:
        return key_ring().decrypt(value.encode()).decode()
    except (InvalidToken, ValidationError, UnicodeError):
        return ""


def carrier_key(text):
    return re.sub(r"[^a-z0-9]", "", str(text or "").casefold())


def provider_carrier(config, carrier):
    mapping = config.carrier_map if isinstance(config.carrier_map, dict) else {}
    value = mapping.get(carrier_key(carrier))
    return value if isinstance(value, str) else ""


# ─── Order, suborder and buyer signals ────────────────────────────────────────

def sync_order_progress(handoff):
    """Mirror a shipment's state onto its suborder, parent order and buyer signals."""
    from apps.routing.models import RoutedSuborder, RoutingStatus
    sub = RoutedSuborder.objects.select_related("order").filter(pk=handoff.routed_suborder_reference).first()
    if sub is None:
        return
    target = {"delivered": RoutingStatus.DELIVERED, "shipped": RoutingStatus.SHIPPED,
              "partially_shipped": RoutingStatus.PARTIALLY_SHIPPED}.get(handoff.status)
    if target and sub.status != target and sub.status != RoutingStatus.DELIVERED:
        sub.status = target
        sub.save(update_fields=["status", "updated_at"])
    order = sub.order
    statuses = list(order.routed_suborders.values_list("status", flat=True))
    delivered = sum(1 for value in statuses if value == RoutingStatus.DELIVERED)
    shipped = sum(1 for value in statuses if value in (RoutingStatus.SHIPPED, RoutingStatus.DELIVERED))
    total = len(statuses)
    wanted = RoutingStatus.DELIVERED if total and delivered == total else RoutingStatus.SHIPPED if total and shipped == total else None
    if wanted and order.status != wanted and order.status != RoutingStatus.DELIVERED:
        order.status = wanted
        order.save(update_fields=["status"])
    for kind, confirmed in ((BuyerUpdateKind.SHIPMENT, shipped), (BuyerUpdateKind.DELIVERY, delivered)):
        if not confirmed:
            continue
        complete = confirmed == total
        signal, created = BuyerUpdateReadySignal.objects.get_or_create(
            order_reference=order.pk, update_kind=kind,
            defaults={"buyer_reference": order.buyer_reference, "company_scope_reference": order.company_scope_reference,
                "expected_vendor_count": total, "confirmed_vendor_count": confirmed, "all_vendors_confirmed": complete,
                "status": BuyerSignalStatus.ELIGIBLE if complete else BuyerSignalStatus.HELD})
        # A buyer who was already told is not told again by a later scan.
        if created or signal.status in (BuyerSignalStatus.DISPATCHED, BuyerSignalStatus.ACKNOWLEDGED):
            continue
        signal.expected_vendor_count, signal.confirmed_vendor_count, signal.all_vendors_confirmed = total, confirmed, complete
        signal.status = BuyerSignalStatus.ELIGIBLE if complete else BuyerSignalStatus.HELD
        signal.save()


def record_events(handoff_id, source, events):
    rows = []
    for event in events:
        occurred = event.get("occurred_at")
        if occurred is None:
            continue
        key = hashlib.sha256("|".join([source, occurred.isoformat(), event.get("status", ""), event.get("status_detail", ""),
            event.get("message", "")]).encode()).hexdigest()
        rows.append(ShipmentTrackingEvent(handoff_id=handoff_id, source=source, status=event.get("status", "")[:30],
            status_detail=event.get("status_detail", "")[:50], message=event.get("message", "")[:500],
            location=event.get("location", "")[:255], occurred_at=occurred, event_key=key))
    if rows:
        ShipmentTrackingEvent.objects.bulk_create(rows, ignore_conflicts=True, batch_size=200)


def apply_progress(handoff_id, *, source, phase=None, shipped_on=None, delivered_on=None, events=(), tracker_id=""):
    """Apply one observation to a shipment. Returns True when its status or dates changed.

    phase: "in_motion", "delivered", "problem" or None (history only).
    """
    with transaction.atomic():
        handoff = FulfillmentHandoff.objects.select_for_update().filter(pk=handoff_id).first()
        if handoff is None:
            return False
        changed = touched = False
        if phase == "delivered" and handoff.status not in ("delivered", "closed", "partially_shipped"):
            handoff.status = "delivered"
            if not handoff.shipped_date and shipped_on:
                handoff.shipped_date = shipped_on
            if not handoff.delivered_date:
                day = delivered_on or timezone.localdate()
                handoff.delivered_date = max(day, handoff.shipped_date) if handoff.shipped_date else day
            changed = True
        elif phase == "in_motion" and handoff.status in ("received", "processing", "exception", "delivery_exception"):
            handoff.status = "shipped"
            if not handoff.shipped_date:
                handoff.shipped_date = shipped_on or timezone.localdate()
            changed = True
        elif phase == "problem" and handoff.status not in ("delivered", "closed", "delivery_exception"):
            handoff.status = "delivery_exception"
            changed = True
        if source == PROVIDER and handoff.tracking_source in ("", "manual_csv"):
            handoff.tracking_source, touched = PROVIDER, True
        elif not handoff.tracking_source:
            handoff.tracking_source, touched = source, True
        if tracker_id and handoff.easypost_tracker_id != tracker_id:
            handoff.easypost_tracker_id, touched = tracker_id, True
        if changed or touched:
            handoff.save()
        record_events(handoff.pk, source, events)
        if changed:
            sync_order_progress(handoff)
        return changed


# ─── Tracker lifecycle ────────────────────────────────────────────────────────

def publish_sync():
    """Ask a worker to register/poll now; the periodic task is the safety net."""
    try:
        from config.celery import app
        app.send_task("apps.fulfillment.tasks.poll_carrier_tracking", retry=False)
    except Exception:
        pass


def ensure_tracker(handoff, config=None):
    """Queue carrier tracking for a shipment. Database only; never calls the provider."""
    config = config or tracking_config()
    if config is None or not config.enabled or not config.encrypted_api_key:
        return None
    code = (handoff.tracking_number or "").strip()
    carrier = (handoff.shipping_carrier or "").strip()
    if not code:
        return None
    if handoff.tracking_source == "vendor_api" and not config.track_vendor_api_shipments:
        return None
    tracker = ShipmentTracker.objects.filter(handoff=handoff).first()
    now = timezone.now()
    if tracker is None:
        if handoff.status in ("delivered", "closed"):
            return None
        tracker = ShipmentTracker.objects.create(handoff=handoff, provider=PROVIDER, tracking_code=code[:255],
            carrier=carrier[:255], state=TrackerState.PENDING, next_poll_at=now)
    elif tracker.tracking_code != code[:255] or tracker.carrier != carrier[:255]:
        # The vendor corrected the shipment: track the new number from scratch.
        ShipmentTracker.objects.filter(pk=tracker.pk).update(tracking_code=code[:255], carrier=carrier[:255],
            provider_carrier="", provider_tracker_id="", state=TrackerState.PENDING, status="", status_detail="",
            est_delivery_date=None, public_url="", signed_by="", provider_updated_at=None, last_event_at=None,
            attempt_count=0, last_error="", next_poll_at=now, updated_at=now)
    else:
        return tracker
    transaction.on_commit(publish_sync)
    return tracker


def _phase(status):
    return "delivered" if status == "delivered" else "in_motion" if status in IN_MOTION else "problem" if status in PROBLEM else None


def apply_tracker_payload(tracker_id, payload, config):
    """Store a provider Tracker object and move the shipment. Returns True if the shipment changed."""
    info = normalize_tracker(payload)
    now = timezone.now()
    with transaction.atomic():
        tracker = ShipmentTracker.objects.select_for_update().filter(pk=tracker_id).first()
        if tracker is None:
            return False
        # Carriers and the provider can deliver updates out of order.
        if info["updated_at"] and tracker.provider_updated_at and info["updated_at"] < tracker.provider_updated_at:
            return False
        tracker.provider_tracker_id = info["id"]
        tracker.provider_carrier = info["carrier"] or tracker.provider_carrier
        tracker.status, tracker.status_detail = info["status"], info["status_detail"]
        tracker.est_delivery_date, tracker.public_url, tracker.signed_by = info["est_delivery_date"], info["public_url"], info["signed_by"]
        tracker.provider_updated_at = info["updated_at"] or tracker.provider_updated_at
        tracker.last_event_at = info["events"][-1]["occurred_at"] if info["events"] else tracker.last_event_at
        tracker.last_synced_at, tracker.attempt_count, tracker.last_error = now, 0, ""
        if info["status"] in TERMINAL_STATUSES:
            tracker.state, tracker.next_poll_at = TrackerState.STOPPED, None
        else:
            tracker.state = TrackerState.REGISTERED
            tracker.next_poll_at = now + timedelta(minutes=max(30, config.poll_interval_minutes))
        tracker.save()
        handoff_id = tracker.handoff_id
    return apply_progress(handoff_id, source=PROVIDER, phase=_phase(info["status"]),
        shipped_on=info["shipped_at"].date() if info["shipped_at"] else None,
        delivered_on=info["delivered_at"].date() if info["delivered_at"] else None,
        events=info["events"], tracker_id=info["id"])


def _record_failure(tracker_id, error):
    now = timezone.now()
    with transaction.atomic():
        tracker = ShipmentTracker.objects.select_for_update().filter(pk=tracker_id).first()
        if tracker is None:
            return
        tracker.attempt_count += 1
        tracker.last_error = error.code[:200]
        tracker.last_synced_at = now
        credentials = error.status in (401, 403)
        if error.temporary or credentials:
            tracker.next_poll_at = now + timedelta(minutes=min(360, 5 * 2 ** min(tracker.attempt_count, 7)))
            if tracker.state == TrackerState.PENDING and tracker.attempt_count >= MAX_REGISTRATION_ATTEMPTS and not credentials:
                tracker.state, tracker.next_poll_at = TrackerState.FAILED, None
        else:
            # The provider refused this tracking number: needs a corrected shipment.
            tracker.state, tracker.next_poll_at = TrackerState.FAILED, None
        tracker.save()
    if error.status in (401, 403):
        CarrierTrackingConfig.objects.filter(provider=PROVIDER).update(last_error=error.code[:200])


def process_tracker(tracker, config, api_key):
    try:
        if tracker.state == TrackerState.PENDING or not tracker.provider_tracker_id:
            carrier = provider_carrier(config, tracker.carrier)
            try:
                payload = create_tracker(api_key, tracker.tracking_code, carrier or None)
            except EasyPostError as error:
                # An unrecognised carrier name must not block tracking: let the provider detect it.
                if not carrier or error.temporary or error.status in (401, 403):
                    raise
                payload = create_tracker(api_key, tracker.tracking_code)
        else:
            payload = retrieve_tracker(api_key, tracker.provider_tracker_id)
        apply_tracker_payload(tracker.pk, payload, config)
        return True
    except EasyPostError as error:
        _record_failure(tracker.pk, error)
        return False


def _claim_due(limit):
    """Lease due trackers so two workers never call the provider for the same shipment."""
    now = timezone.now()
    with transaction.atomic():
        query = ShipmentTracker.objects.filter(state__in=(TrackerState.PENDING, TrackerState.REGISTERED)).filter(
            Q(next_poll_at__lte=now) | Q(next_poll_at__isnull=True)).order_by("next_poll_at", "created_at")
        query = query.select_for_update(skip_locked=True) if connection.features.has_select_for_update_skip_locked else query.select_for_update()
        trackers = list(query[:limit])
        if trackers:
            ShipmentTracker.objects.filter(pk__in=[row.pk for row in trackers]).update(next_poll_at=now + timedelta(minutes=CLAIM_MINUTES))
    return trackers


def sync_due_trackers(limit=100):
    """Register pending trackers and refresh those the provider has not pushed recently."""
    config = tracking_config()
    if config is None or not config.enabled:
        return {"status": "skipped", "reason": "no_carrier_tracker_configured"}
    api_key = unseal(config.encrypted_api_key)
    if not api_key:
        return {"status": "skipped", "reason": "api_key_unavailable"}
    expired = timezone.now() - timedelta(days=MAX_TRACKING_DAYS)
    ShipmentTracker.objects.filter(state=TrackerState.REGISTERED, created_at__lt=expired).update(
        state=TrackerState.STOPPED, next_poll_at=None, last_error="TRACKING_WINDOW_EXPIRED")
    trackers = _claim_due(limit)
    ok = sum(1 for tracker in trackers if process_tracker(tracker, config, api_key))
    return {"status": "ok", "checked": len(trackers), "updated": ok, "failed": len(trackers) - ok}


# ─── Provider webhook ─────────────────────────────────────────────────────────

def handle_provider_event(config, payload, payload_hash):
    """Apply one verified provider event. Returns (http_status_text, receipt or None)."""
    event_id = payload.get("id")
    description = payload.get("description")
    if not isinstance(event_id, str) or not event_id or not isinstance(description, str):
        return "invalid", None
    result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
    try:
        with transaction.atomic():
            receipt = CarrierWebhookReceipt.objects.create(provider=PROVIDER, provider_event_id=event_id[:200],
                event_type=description[:100], mode=str(payload.get("mode") or "")[:20], payload_hash=payload_hash,
                tracker_reference=str(result.get("id") or "")[:100])
    except IntegrityError:
        return "duplicate", None

    def finish(status, code=""):
        receipt.status, receipt.error_code, receipt.processed_at = status, code[:100], timezone.now()
        receipt.save(update_fields=["status", "error_code", "processed_at"])
        return status, receipt

    if description not in ("tracker.created", "tracker.updated"):
        return finish("skipped", "UNSUBSCRIBED_EVENT")
    # Test-mode events must never move a live shipment, and the reverse.
    if receipt.mode and receipt.mode != config.mode:
        return finish("skipped", "MODE_MISMATCH")
    tracker = ShipmentTracker.objects.filter(provider=PROVIDER, provider_tracker_id=receipt.tracker_reference).first() if receipt.tracker_reference else None
    if tracker is None:
        code = str(result.get("tracking_code") or "")
        tracker = ShipmentTracker.objects.filter(provider=PROVIDER, tracking_code=code, provider_tracker_id="").order_by("-created_at").first() if code else None
    if tracker is None:
        return finish("skipped", "TRACKER_NOT_FOUND")
    try:
        apply_tracker_payload(tracker.pk, result, config)
    except EasyPostError as error:
        return finish("failed", error.code)
    return finish("processed")


# ─── Read model for buyers, vendors and admins ────────────────────────────────

def tracking_summary(handoff):
    """Carrier status block for API responses; None when no tracker exists."""
    try:
        tracker = handoff.tracker
    except ShipmentTracker.DoesNotExist:
        return None
    return {
        "provider": tracker.provider, "state": tracker.state,
        "status": tracker.status or "unknown", "status_label": STATUS_LABELS.get(tracker.status or "unknown", ""),
        "status_detail": tracker.status_detail,
        "estimated_delivery_date": tracker.est_delivery_date.isoformat() if tracker.est_delivery_date else None,
        "tracking_url": tracker.public_url or None, "signed_by": tracker.signed_by or None,
        "last_event_at": tracker.last_event_at.isoformat() if tracker.last_event_at else None,
        "last_synced_at": tracker.last_synced_at.isoformat() if tracker.last_synced_at else None,
    }


def tracking_events(handoff):
    return [{"source": row.source, "status": row.status, "status_detail": row.status_detail, "message": row.message,
             "location": row.location, "occurred_at": row.occurred_at.isoformat()}
            for row in handoff.tracking_events.order_by("-occurred_at")[:100]]
