"""Outbound vendor webhook dispatch with HMAC signing and tenant isolation."""
import hashlib
import hmac
import json
import time
from datetime import timedelta
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from .commerce_models import (
    VendorCommerceProfile, VendorOutboundDelivery, OUTBOUND_EVENT_KEYS,
)
from .catalog_sync import audit
from .catalog_transport import CatalogTransportError, public_target, PinnedHTTPSConnection


def _read_outbound_secret(profile):
    raw = profile.encrypted_outbound_secret
    if not raw:
        return None
    try:
        from cryptography.fernet import Fernet, MultiFernet
        parts = raw.split('|')
        if len(parts) >= 2:
            keys = parts[:-1]
            token = parts[-1]
            if len(keys) > 1:
                f = MultiFernet([Fernet(k) for k in keys])
            else:
                f = Fernet(keys[0])
            return f.decrypt(token.encode())
        from django.conf import settings
        env_keys = getattr(settings, 'VENDOR_CATALOG_ENCRYPTION_KEYS', [])
        if isinstance(env_keys, str):
            env_keys = [k.strip() for k in env_keys.split(',') if k.strip()]
        if env_keys:
            f = MultiFernet([Fernet(k.encode() if isinstance(k, str) else k) for k in env_keys]) if len(env_keys) > 1 else Fernet(env_keys[0].encode() if isinstance(env_keys[0], str) else env_keys[0])
            return f.decrypt(raw.encode())
        return None
    except Exception:
        return None


def queue_outbound_event(vendor_company_id, event_type, event_data, *, source_id=None):
    """Queue an outbound webhook for every profile subscribed to this event.

    Tenant isolation: only profiles belonging to vendor_company_id are matched.
    The payload never includes data from other vendors.
    """
    if event_type not in OUTBOUND_EVENT_KEYS:
        return []

    profiles = VendorCommerceProfile.objects.filter(
        vendor_company_id=vendor_company_id,
        outbound_enabled=True,
        connection__is_retired=False,
        vendor_company__status='active',
    ).select_related('connection__vendor_company')

    deliveries = []
    for profile in profiles:
        subscribed = set(profile.outbound_events or [])
        if event_type not in subscribed:
            continue

        idempotency_key = f'{profile.pk}:{event_type}:{source_id or uuid4()}'

        if VendorOutboundDelivery.objects.filter(idempotency_key=idempotency_key).exists():
            continue

        envelope = {
            'id': str(uuid4()),
            'type': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': event_data,
        }

        delivery = VendorOutboundDelivery.objects.create(
            profile=profile,
            vendor_company_id=vendor_company_id,
            event_type=event_type,
            idempotency_key=idempotency_key,
            payload=envelope,
            status='pending',
        )
        deliveries.append(delivery)
        _publish_delivery(delivery.pk)

    return deliveries


def _publish_delivery(delivery_id, delay=0):
    from config.celery import app
    try:
        app.send_task(
            'integration.vendor_commerce.outbound_delivery',
            args=[str(delivery_id)],
            queue='vendor_commerce',
            countdown=max(0, delay),
            retry=False,
        )
    except Exception:
        VendorOutboundDelivery.objects.filter(
            pk=delivery_id, status__in=['pending', 'retrying']
        ).update(last_error='QUEUE_UNAVAILABLE')


def process_outbound_delivery(delivery_id):
    """Execute a single outbound webhook delivery with HMAC signing."""
    with transaction.atomic():
        delivery = VendorOutboundDelivery.objects.select_for_update().select_related(
            'profile__connection__vendor_company', 'profile__updated_by',
        ).get(pk=delivery_id)

        if delivery.status not in ('pending', 'retrying'):
            return
        if delivery.next_retry_at and delivery.next_retry_at > timezone.now():
            return

        delivery.status = 'in_flight'
        delivery.attempt_count += 1
        delivery.save(update_fields=['status', 'attempt_count'])

    profile = delivery.profile

    if (not profile.outbound_enabled or not profile.outbound_url
            or not profile.encrypted_outbound_secret
            or profile.connection.is_retired
            or profile.vendor_company.status != 'active'):
        _fail_delivery(delivery, 'PROFILE_DISABLED')
        return

    if delivery.vendor_company_id != profile.vendor_company_id:
        _fail_delivery(delivery, 'TENANT_MISMATCH')
        return

    try:
        payload_bytes = json.dumps(
            delivery.payload, ensure_ascii=False, allow_nan=False, separators=(',', ':')
        ).encode('utf-8')

        secret = _read_outbound_secret(profile)
        if not secret:
            _fail_delivery(delivery, 'SECRET_UNAVAILABLE')
            return

        ts = str(int(time.time()))
        message = f'{ts}.'.encode() + payload_bytes
        signature = hmac.new(secret, message, hashlib.sha256).hexdigest()

        host, path, addresses = public_target(profile.outbound_url)
        conn = PinnedHTTPSConnection(host, addresses[0])
        try:
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'CIXCI-Outbound-Webhook/1',
                'X-Signature': signature,
                'X-Timestamp': ts,
                'X-Event-Type': delivery.event_type,
                'X-Delivery-Id': str(delivery.pk),
            }
            conn.request('POST', path, body=payload_bytes, headers=headers)
            response = conn.getresponse()
            response.read(65536)
            http_status = response.status
        finally:
            conn.close()

        if 200 <= http_status < 300:
            with transaction.atomic():
                d = VendorOutboundDelivery.objects.select_for_update().get(pk=delivery.pk)
                if d.status != 'in_flight':
                    return
                d.status = 'delivered'
                d.last_response_code = http_status
                d.delivered_at = timezone.now()
                d.last_error = ''
                d.save()
            audit('outbound_webhook_delivered', profile.connection, profile.updated_by,
                  delivery_id=str(delivery.pk), event_type=delivery.event_type,
                  vendor_company_id=str(delivery.vendor_company_id), http_status=http_status)
        else:
            _retry_or_fail(delivery, profile, http_status, f'HTTP_{http_status}')

    except CatalogTransportError as exc:
        _retry_or_fail(delivery, profile, exc.status, exc.code)
    except (OSError, Exception) as exc:
        _retry_or_fail(delivery, profile, None, str(exc)[:200])


def _retry_or_fail(delivery, profile, http_status, error_code):
    with transaction.atomic():
        d = VendorOutboundDelivery.objects.select_for_update().get(pk=delivery.pk)
        if d.status != 'in_flight':
            return
        d.last_response_code = http_status
        d.last_error = str(error_code)[:500]

        retryable = http_status is None or http_status == 429 or (http_status and http_status >= 500)
        if retryable and d.attempt_count < d.max_attempts:
            delay = min(1800, 30 * 2 ** d.attempt_count)
            d.status = 'retrying'
            d.next_retry_at = timezone.now() + timedelta(seconds=delay)
            d.save()
            transaction.on_commit(lambda: _publish_delivery(d.pk, delay))
        else:
            d.status = 'failed'
            d.save()
            audit('outbound_webhook_failed', profile.connection, profile.updated_by,
                  delivery_id=str(d.pk), event_type=d.event_type,
                  vendor_company_id=str(d.vendor_company_id), error=str(error_code)[:200])


def _fail_delivery(delivery, error_code):
    with transaction.atomic():
        d = VendorOutboundDelivery.objects.select_for_update().get(pk=delivery.pk)
        d.status = 'failed'
        d.last_error = error_code
        d.save()


def retry_stalled_deliveries():
    """Pick up retrying deliveries whose next_retry_at has passed."""
    now = timezone.now()
    stalled = VendorOutboundDelivery.objects.filter(
        status='retrying', next_retry_at__lte=now,
    ).values_list('pk', flat=True)[:100]
    for pk in stalled:
        _publish_delivery(pk)
    return len(stalled)
