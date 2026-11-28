"""Outbound webhooks to buyers: the same order updates a buyer otherwise polls for.

A webhook is another delivery channel for an existing BuyerUpdateReadySignal; it
adds no rule about when a buyer is told. Tenant isolation: an endpoint belongs
to one buyer company and only receives that company's events.
"""
import hashlib
import hmac
import json
import secrets
import time
import uuid
from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone

EVENT_TYPES = ("order.shipment_complete", "order.delivery_complete", "webhook.test")
MAX_ATTEMPTS = 5


class BuyerWebhookEndpoint(models.Model):
    """Where one buyer company receives order updates. One endpoint per company."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField("tenant.Company", on_delete=models.PROTECT, related_name="buyer_webhook_endpoint")
    url = models.URLField(max_length=1000)
    encrypted_secret = models.TextField(editable=False)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey("tenant.User", null=True, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "integration"
        db_table = "integration_buyer_webhook_endpoint"


class BuyerWebhookDelivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(BuyerWebhookEndpoint, on_delete=models.CASCADE, related_name="deliveries")
    company = models.ForeignKey("tenant.Company", on_delete=models.PROTECT, related_name="+")
    event_type = models.CharField(max_length=100, db_index=True)
    idempotency_key = models.CharField(max_length=255, unique=True)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default="pending", db_index=True, choices=[
        ("pending", "Pending"), ("in_flight", "In Flight"), ("delivered", "Delivered"),
        ("failed", "Failed"), ("retrying", "Retrying")])
    attempt_count = models.PositiveSmallIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    last_response_code = models.PositiveSmallIntegerField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "integration"
        db_table = "integration_buyer_webhook_delivery"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "next_retry_at"], name="buyer_hook_due_idx"),
                   models.Index(fields=["company", "created_at"], name="buyer_hook_company_idx")]


def seal(value):
    from .catalog_secrets import key_ring
    return key_ring().encrypt(value.encode()).decode()


def unseal(value):
    from cryptography.fernet import InvalidToken
    from django.core.exceptions import ValidationError
    from .catalog_secrets import key_ring
    try:
        return key_ring().decrypt(value.encode()).decode()
    except (InvalidToken, ValidationError, UnicodeError):
        return ""


def new_secret():
    return "whsec_" + secrets.token_urlsafe(32)


def audit(event, actor, company_id, **details):
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code="integration.buyer_webhook." + event,
        event_description=json.dumps(details, default=str), status=details.get("status", "success"),
        actor_reference=getattr(actor, "id", None), company_scope_reference=company_id,
        source_module="integration", source_record_type="BuyerWebhookEndpoint", source_record_id=details.get("endpoint_id"))


def queue_buyer_event(company_id, event_type, data, *, source_id=None):
    """Queue one event for the buyer company's endpoint. Returns the delivery or None."""
    if event_type not in EVENT_TYPES:
        return None
    endpoint = BuyerWebhookEndpoint.objects.filter(company_id=company_id, is_active=True, company__status="active").first()
    if endpoint is None:
        return None
    key = f"{endpoint.pk}:{event_type}:{source_id or uuid.uuid4()}"
    envelope = {"id": str(uuid.uuid4()), "type": event_type, "created_at": timezone.now().isoformat(), "data": data}
    delivery, created = BuyerWebhookDelivery.objects.get_or_create(idempotency_key=key, defaults={
        "endpoint": endpoint, "company_id": company_id, "event_type": event_type, "payload": envelope})
    if created:
        transaction.on_commit(lambda: publish(delivery.pk))
    return delivery


def publish(delivery_id, delay=0):
    from config.celery import app
    try:
        app.send_task("integration.buyer_webhooks.deliver", args=[str(delivery_id)], queue="vendor_commerce",
                      countdown=max(0, delay), retry=False)
    except Exception:
        # Left pending; the periodic retry picks it up.
        BuyerWebhookDelivery.objects.filter(pk=delivery_id, status__in=["pending", "retrying"]).update(last_error="QUEUE_UNAVAILABLE")


def signature(secret, timestamp, body):
    """HMAC-SHA256 over '<timestamp>.<raw body>', hex encoded."""
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()


def send(url, body, headers):
    """POST to a public HTTPS address only; returns the HTTP status."""
    from .catalog_transport import PinnedHTTPSConnection, public_target
    host, path, addresses = public_target(url)
    connection = PinnedHTTPSConnection(host, addresses[0])
    try:
        connection.request("POST", path, body=body, headers=headers)
        response = connection.getresponse()
        response.read(65536)
        return response.status
    finally:
        connection.close()


def process_delivery(delivery_id):
    from .catalog_transport import CatalogTransportError
    with transaction.atomic():
        delivery = BuyerWebhookDelivery.objects.select_for_update(of=("self",)).select_related("endpoint__company").get(pk=delivery_id)
        if delivery.status not in ("pending", "retrying"):
            return delivery.status
        if delivery.next_retry_at and delivery.next_retry_at > timezone.now():
            return delivery.status
        delivery.status = "in_flight"
        delivery.attempt_count += 1
        delivery.save(update_fields=["status", "attempt_count"])
    endpoint = delivery.endpoint
    if not endpoint.is_active or endpoint.company.status != "active":
        return _finish(delivery, "failed", None, "ENDPOINT_DISABLED")
    if delivery.company_id != endpoint.company_id:
        return _finish(delivery, "failed", None, "TENANT_MISMATCH")
    secret = unseal(endpoint.encrypted_secret)
    if not secret:
        return _finish(delivery, "failed", None, "SECRET_UNAVAILABLE")
    body = json.dumps(delivery.payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode()
    timestamp = str(int(time.time()))
    headers = {"Content-Type": "application/json", "User-Agent": "CIXCI-Buyer-Webhook/1",
               "CIXCI-Signature": f"t={timestamp},v1={signature(secret, timestamp, body)}",
               "CIXCI-Event-Type": delivery.event_type, "CIXCI-Delivery-Id": str(delivery.pk)}
    try:
        status = send(endpoint.url, body, headers)
    except CatalogTransportError as error:
        return _retry_or_fail(delivery, error.status, error.code)
    except Exception as error:
        return _retry_or_fail(delivery, None, type(error).__name__)
    if 200 <= status < 300:
        return _finish(delivery, "delivered", status, "")
    return _retry_or_fail(delivery, status, f"HTTP_{status}")


def _finish(delivery, status, http_status, error):
    with transaction.atomic():
        row = BuyerWebhookDelivery.objects.select_for_update(of=("self",)).get(pk=delivery.pk)
        if row.status != "in_flight":
            return row.status
        row.status, row.last_response_code, row.last_error, row.next_retry_at = status, http_status, str(error)[:500], None
        if status == "delivered":
            row.delivered_at = timezone.now()
        row.save()
        if status == "failed":
            audit("delivery_failed", None, row.company_id, endpoint_id=str(row.endpoint_id), delivery_id=str(row.pk),
                  event_type=row.event_type, error=str(error)[:200], status="failure")
    return status


def _retry_or_fail(delivery, http_status, error):
    retryable = http_status is None or http_status == 429 or http_status >= 500
    if not retryable or delivery.attempt_count >= MAX_ATTEMPTS:
        return _finish(delivery, "failed", http_status, error)
    delay = min(1800, 30 * 2 ** delivery.attempt_count)
    with transaction.atomic():
        row = BuyerWebhookDelivery.objects.select_for_update(of=("self",)).get(pk=delivery.pk)
        if row.status != "in_flight":
            return row.status
        row.status, row.last_response_code, row.last_error = "retrying", http_status, str(error)[:500]
        row.next_retry_at = timezone.now() + timedelta(seconds=delay)
        row.save()
        transaction.on_commit(lambda: publish(row.pk, delay))
    return "retrying"


def retry_due(limit=100):
    """Publish deliveries that are due again or were never picked up by a worker."""
    now = timezone.now()
    due = list(BuyerWebhookDelivery.objects.filter(
        models.Q(status="retrying", next_retry_at__lte=now) |
        models.Q(status="pending", created_at__lte=now - timedelta(minutes=2))).values_list("pk", flat=True)[:limit])
    for pk in due:
        publish(pk)
    return len(due)
