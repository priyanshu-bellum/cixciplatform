"""Inbound vendor webhook receiver with signature verification and dedup."""
import hashlib
import hmac
import json
import time
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .commerce_models import VendorCommerceProfile, VendorWebhookReceipt
from .catalog_config import path_value


MAX_PAYLOAD = 512 * 1024
TIMESTAMP_TOLERANCE = 300
WEBHOOK_RATE_LIMIT = 120  # max requests per window per receiver
WEBHOOK_RATE_WINDOW = 60  # seconds


def read_webhook_secret(profile):
    raw = profile.encrypted_webhook_secret
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
            f = MultiFernet([Fernet(k.encode() if isinstance(k, str) else k) for k in env_keys])
            return f.decrypt(raw.encode())
        return None
    except Exception:
        return None


def encrypt_webhook_secret(secret_bytes):
    from cryptography.fernet import Fernet, MultiFernet
    from django.conf import settings
    env_keys = getattr(settings, 'VENDOR_CATALOG_ENCRYPTION_KEYS', [])
    if isinstance(env_keys, str):
        env_keys = [k.strip() for k in env_keys.split(',') if k.strip()]
    if env_keys:
        f = MultiFernet([Fernet(k.encode() if isinstance(k, str) else k) for k in env_keys]) if len(env_keys) > 1 else Fernet(env_keys[0].encode() if isinstance(env_keys[0], str) else env_keys[0])
        return f.encrypt(secret_bytes).decode()
    key = Fernet.generate_key()
    f = Fernet(key)
    return key.decode() + '|' + f.encrypt(secret_bytes).decode()


@method_decorator(csrf_exempt, name='dispatch')
class WebhookReceiverView(View):
    http_method_names = ['post']

    def post(self, request, receiver_id):
        cache_key = f'webhook_rl:{receiver_id}'
        hits = cache.get(cache_key, 0)
        if hits >= WEBHOOK_RATE_LIMIT:
            return JsonResponse({'error': 'rate_limited'}, status=429)
        cache.set(cache_key, hits + 1, WEBHOOK_RATE_WINDOW)

        try:
            profile = VendorCommerceProfile.objects.select_related(
                'connection__vendor_company'
            ).get(receiver_id=receiver_id, webhook_enabled=True)
        except (VendorCommerceProfile.DoesNotExist, ValueError):
            return JsonResponse({'error': 'not_found'}, status=404)

        if not profile.connection.vendor_company.status == 'active':
            return JsonResponse({'error': 'vendor_inactive'}, status=403)

        body = request.body
        if len(body) > MAX_PAYLOAD:
            return JsonResponse({'error': 'payload_too_large'}, status=413)

        config = profile.config.get('webhook', {})
        scheme = config.get('scheme', 'timestamp_hmac')
        sig_header = request.META.get(
            'HTTP_' + config.get('signature_header', 'X-Signature').upper().replace('-', '_'), ''
        )

        if scheme == 'balaji_v1':
            if not self._verify_balaji(body, sig_header, profile):
                return JsonResponse({'error': 'invalid_signature'}, status=401)
        elif scheme == 'timestamp_hmac':
            ts_header = request.META.get(
                'HTTP_' + config.get('timestamp_header', 'X-Timestamp').upper().replace('-', '_'), ''
            )
            if not self._verify_timestamp(body, sig_header, ts_header, profile, config):
                return JsonResponse({'error': 'invalid_signature'}, status=401)
        else:
            return JsonResponse({'error': 'unsupported_scheme'}, status=400)

        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({'error': 'invalid_json'}, status=400)

        if not isinstance(payload, dict):
            return JsonResponse({'error': 'invalid_payload'}, status=400)

        event_id = str(path_value(payload, config.get('id_path', 'id')) or '')
        event_type = str(path_value(payload, config.get('type_path', 'type')) or '')
        is_test = bool(path_value(payload, config.get('test_path', 'test')))

        if not event_id or not event_type:
            return JsonResponse({'error': 'missing_event_fields'}, status=400)

        allowed_events = config.get('events', [])
        if event_type not in allowed_events:
            return JsonResponse({'status': 'ignored', 'reason': 'unsubscribed_event'}, status=200)

        payload_hash = hashlib.sha256(body).hexdigest()

        from .catalog_secrets import encrypt_credentials as _enc
        try:
            encrypted_payload = _encrypt_payload(body)
        except Exception:
            encrypted_payload = ''

        try:
            receipt = VendorWebhookReceipt.objects.create(
                profile=profile,
                provider_event_id=event_id[:200],
                event_type=event_type[:100],
                is_test=is_test,
                payload_hash=payload_hash,
                encrypted_payload=encrypted_payload,
                status='received',
            )
        except IntegrityError:
            return JsonResponse({'status': 'duplicate', 'event_id': event_id}, status=200)

        route = config.get('event_routes', {}).get(event_type, 'ignore')
        if route == 'ignore' or is_test:
            receipt.status = 'skipped'
            receipt.processed_at = timezone.now()
            receipt.save(update_fields=['status', 'processed_at'])
            return JsonResponse({'status': 'accepted', 'event_id': event_id}, status=200)

        try:
            data = path_value(payload, config.get('data_path', 'data')) or {}
            _dispatch_event(route, event_type, data, profile, config, receipt)
            receipt.status = 'processed'
            receipt.processed_at = timezone.now()
            receipt.save(update_fields=['status', 'processed_at'])
        except Exception as exc:
            receipt.status = 'failed'
            receipt.error_code = str(exc)[:100]
            receipt.processed_at = timezone.now()
            receipt.save(update_fields=['status', 'error_code', 'processed_at'])

        return JsonResponse({'status': 'accepted', 'event_id': event_id}, status=200)

    def _verify_balaji(self, payload_bytes, signature, profile):
        key = read_webhook_secret(profile)
        if not key:
            return False
        expected = hmac.new(key, payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def _verify_timestamp(self, payload_bytes, signature, timestamp, profile, config):
        key = read_webhook_secret(profile)
        if not key:
            return False
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > TIMESTAMP_TOLERANCE:
                return False
        except (ValueError, TypeError):
            return False
        message = f'{ts}.'.encode() + payload_bytes
        expected = hmac.new(key, message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)


def _encrypt_payload(payload_bytes):
    from cryptography.fernet import Fernet
    from django.conf import settings
    keys = getattr(settings, 'CATALOG_CREDENTIAL_KEYS', None)
    if keys:
        from cryptography.fernet import MultiFernet
        parts = [k.strip() for k in keys.split(',') if k.strip()]
        f = MultiFernet([Fernet(p) for p in parts]) if len(parts) > 1 else Fernet(parts[0])
    else:
        key = Fernet.generate_key()
        f = Fernet(key)
    return f.encrypt(payload_bytes).decode()


def _dispatch_event(route, event_type, data, profile, config, receipt):
    from .webhook_handlers import handle_order_event, handle_shipment_event
    if route == 'order':
        record_path = config.get('order_record_path', 'order')
        record = path_value(data, record_path) if record_path else data
        handle_order_event(event_type, record or data, profile, receipt)
    elif route == 'shipment':
        record_path = config.get('shipment_record_path', 'shipment')
        record = path_value(data, record_path) if record_path else data
        handle_shipment_event(event_type, record or data, profile, receipt)
