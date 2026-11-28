"""Carrier tracking administration (CIXCI admins) and the provider webhook receiver."""
import hashlib
import json
import secrets
import uuid

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import easypost
from .models import CarrierTrackingConfig, CarrierWebhookReceipt, ShipmentTracker, TrackerState
from .tracking import PROVIDER, handle_provider_event, seal, sync_due_trackers, tracking_config, unseal

MAX_PAYLOAD = 1024 * 1024
RATE_LIMIT, RATE_WINDOW = 600, 60


def webhook_path(config):
    return f"/api/v1/fulfillment/carrier-webhooks/{config.provider}/{config.receiver_id}/"


def audit(event, actor, **details):
    from apps.audit.models import AuditRecord
    AuditRecord.objects.create(event_code="fulfillment.carrier_tracking." + event, event_description=json.dumps(details, default=str),
        status="success", actor_reference=getattr(actor, "id", None), company_scope_reference=uuid.UUID(int=0),
        source_module="fulfillment", source_record_type="CarrierTrackingConfig", source_record_id=details.get("config_id"))


class CarrierTrackingConfigSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=False, max_length=500, trim_whitespace=True)
    has_api_key = serializers.SerializerMethodField()
    has_webhook_secret = serializers.SerializerMethodField()
    webhook_path = serializers.SerializerMethodField()

    class Meta:
        model = CarrierTrackingConfig
        fields = ("id", "provider", "enabled", "mode", "api_key", "has_api_key", "api_key_hint", "has_webhook_secret",
                  "provider_webhook_id", "webhook_path", "track_vendor_api_shipments", "carrier_map", "poll_interval_minutes",
                  "last_verified_at", "last_error", "updated_at")
        read_only_fields = ("id", "provider", "api_key_hint", "provider_webhook_id", "last_verified_at", "last_error", "updated_at")

    def get_has_api_key(self, obj):
        return bool(obj.encrypted_api_key)

    def get_has_webhook_secret(self, obj):
        return bool(obj.encrypted_webhook_secret)

    def get_webhook_path(self, obj):
        return webhook_path(obj)

    def validate_mode(self, value):
        if value not in ("test", "production"):
            raise serializers.ValidationError("Choose test or production.")
        return value

    def validate_poll_interval_minutes(self, value):
        if not 30 <= value <= 1440:
            raise serializers.ValidationError("Use 30 to 1440 minutes.")
        return value

    def validate_carrier_map(self, value):
        if not isinstance(value, dict) or len(value) > 200:
            raise serializers.ValidationError("Supply up to 200 carrier names.")
        from .tracking import carrier_key
        result = {}
        for name, target in value.items():
            key = carrier_key(name)
            if not key or not isinstance(target, str) or not target.strip() or len(target) > 100:
                raise serializers.ValidationError("Each vendor carrier name needs a provider carrier value.")
            result[key] = target.strip()
        return result

    def validate(self, attrs):
        key = attrs.pop("api_key", None)
        if key:
            if any(char.isspace() for char in key):
                raise serializers.ValidationError({"api_key": "The API key cannot contain spaces."})
            try:
                attrs["encrypted_api_key"] = seal(key)
            except ValidationError as error:
                raise serializers.ValidationError({"api_key": error.messages}) from error
            attrs["api_key_hint"] = "…" + key[-4:]
            # A new key is unverified until Test Connection succeeds again.
            attrs["last_verified_at"], attrs["last_error"] = None, ""
        enabled = attrs.get("enabled", self.instance.enabled if self.instance else False)
        has_key = bool(attrs.get("encrypted_api_key") or (self.instance and self.instance.encrypted_api_key))
        if enabled and not has_key:
            raise serializers.ValidationError({"enabled": "Save an API key before enabling carrier tracking."})
        return attrs


class ShipmentTrackerSerializer(serializers.ModelSerializer):
    handoff_status = serializers.CharField(source="handoff.status", read_only=True)
    vendor_company_reference = serializers.UUIDField(source="handoff.vendor_company_reference", read_only=True)

    class Meta:
        model = ShipmentTracker
        fields = ("id", "handoff", "handoff_status", "vendor_company_reference", "tracking_code", "carrier", "provider_carrier",
                  "provider_tracker_id", "state", "status", "status_detail", "est_delivery_date", "public_url",
                  "last_event_at", "last_synced_at", "next_poll_at", "attempt_count", "last_error", "created_at")
        read_only_fields = fields


class CarrierTrackingViewSet(viewsets.GenericViewSet):
    """Single platform configuration plus tracker operations. CIXCI admins only."""
    permission_classes = [IsAuthenticated]
    serializer_class = CarrierTrackingConfigSerializer
    queryset = CarrierTrackingConfig.objects.none()

    def check_permissions(self, request):
        super().check_permissions(request)
        if not getattr(request.user, "is_cixci_admin", False):
            raise PermissionDenied("Carrier tracking is configured by CIXCI System Admins.")

    def _config(self):
        config, _ = CarrierTrackingConfig.objects.get_or_create(provider=PROVIDER)
        return config

    def _payload(self, config):
        data = CarrierTrackingConfigSerializer(config).data
        counts = {row["state"]: row["total"] for row in ShipmentTracker.objects.values("state").annotate(total=Count("id"))}
        data["trackers"] = {state: counts.get(state, 0) for state in TrackerState.values}
        data["trackers"]["delivered"] = ShipmentTracker.objects.filter(status="delivered").count()
        last = CarrierWebhookReceipt.objects.filter(provider=PROVIDER).values("received_at", "status", "event_type").first()
        data["last_webhook"] = last
        return data

    def list(self, request):
        return Response(self._payload(self._config()))

    @action(detail=False, methods=["patch"], url_path="config")
    def configure(self, request):
        config = self._config()
        before = {name: getattr(config, name) for name in ("enabled", "mode", "track_vendor_api_shipments", "poll_interval_minutes")}
        serializer = CarrierTrackingConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        config = serializer.save(updated_by=request.user)
        after = {name: getattr(config, name) for name in before}
        audit("configured", request.user, config_id=config.pk, changed={k: [before[k], after[k]] for k in before if before[k] != after[k]},
              api_key_replaced="api_key" in request.data)
        return Response(self._payload(config))

    @action(detail=False, methods=["post"], url_path="test")
    def test_connection(self, request):
        config = self._config()
        try:
            easypost.verify_api_key(unseal(config.encrypted_api_key))
        except easypost.EasyPostError as error:
            if error.code != "API_KEY_REQUIRED":  # nothing was sent to the provider
                CarrierTrackingConfig.objects.filter(pk=config.pk).update(last_error=error.code[:200])
            audit("connection_test_failed", request.user, config_id=config.pk, code=error.code)
            detail = "Save an API key first." if error.code == "API_KEY_REQUIRED" else error.message or "The provider rejected the request."
            return Response({"ok": False, "code": error.code, "detail": detail}, status=400)
        CarrierTrackingConfig.objects.filter(pk=config.pk).update(last_verified_at=timezone.now(), last_error="")
        audit("connection_tested", request.user, config_id=config.pk)
        return Response({"ok": True, **self._payload(self._config())})

    def _new_secret(self, config):
        secret = secrets.token_urlsafe(32)
        config.encrypted_webhook_secret = seal(secret)
        return secret

    @action(detail=False, methods=["post"], url_path="generate-webhook-secret")
    def generate_webhook_secret(self, request):
        """Manual setup: shown once, to be pasted into the provider's webhook settings."""
        config = self._config()
        try:
            secret = self._new_secret(config)
        except ValidationError as error:
            return Response({"detail": error.messages}, status=400)
        config.provider_webhook_id, config.updated_by = "", request.user
        config.save()
        audit("webhook_secret_generated", request.user, config_id=config.pk)
        return Response({"webhook_secret": secret, **self._payload(config)})

    @action(detail=False, methods=["post"], url_path="register-webhook")
    def register_webhook(self, request):
        """Create the provider webhook for this platform's public HTTPS origin."""
        config = self._config()
        origin = str(request.data.get("origin") or "").rstrip("/")
        from apps.integration.catalog_transport import CatalogTransportError, public_target
        try:
            public_target(origin + webhook_path(config), resolve=False)
        except CatalogTransportError:
            return Response({"detail": "Use this platform's public https:// address."}, status=400)
        try:
            secret = self._new_secret(config)
            created = easypost.create_webhook(unseal(config.encrypted_api_key), origin + webhook_path(config), secret)
        except ValidationError as error:
            return Response({"detail": error.messages}, status=400)
        except easypost.EasyPostError as error:
            return Response({"ok": False, "code": error.code, "detail": error.message or "The provider rejected the webhook."}, status=400)
        config.provider_webhook_id = str(created.get("id") or "")[:100]
        config.updated_by = request.user
        config.save()
        audit("webhook_registered", request.user, config_id=config.pk, webhook_id=config.provider_webhook_id)
        return Response({"ok": True, **self._payload(config)})

    @action(detail=False, methods=["get"], url_path="trackers")
    def trackers(self, request):
        rows = ShipmentTracker.objects.select_related("handoff").order_by("-updated_at")
        state = request.query_params.get("state")
        if state in TrackerState.values:
            rows = rows.filter(state=state)
        search = (request.query_params.get("search") or "").strip()
        if search:
            rows = rows.filter(tracking_code__icontains=search[:100])
        page = self.paginate_queryset(rows)
        data = ShipmentTrackerSerializer(page if page is not None else rows[:200], many=True).data
        return self.get_paginated_response(data) if page is not None else Response(data)

    @action(detail=False, methods=["post"], url_path="trackers/(?P<tracker_id>[0-9a-f-]{36})/retry")
    def retry_tracker(self, request, tracker_id=None):
        updated = ShipmentTracker.objects.filter(pk=tracker_id, state=TrackerState.FAILED).update(
            state=TrackerState.PENDING, attempt_count=0, last_error="", next_poll_at=timezone.now())
        if not updated:
            return Response({"detail": "Only a failed tracker can be retried."}, status=400)
        audit("tracker_retry", request.user, tracker_id=tracker_id)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        """Register/refresh a bounded batch now instead of waiting for the schedule."""
        result = sync_due_trackers(limit=25)
        audit("manual_sync", request.user, result=result)
        return Response(result)


@method_decorator(csrf_exempt, name="dispatch")
class CarrierWebhookView(View):
    """Signed provider events. Unauthenticated by design: the HMAC is the credential."""
    http_method_names = ["post"]

    def post(self, request, provider, receiver_id):
        key = f"carrier_webhook_rl:{receiver_id}"
        hits = cache.get(key, 0)
        if hits >= RATE_LIMIT:
            return JsonResponse({"error": "rate_limited"}, status=429)
        cache.set(key, hits + 1, RATE_WINDOW)
        config = tracking_config() if provider == PROVIDER else None
        if config is None or config.receiver_id != receiver_id or not config.enabled:
            return JsonResponse({"error": "not_found"}, status=404)
        body = request.body
        if len(body) > MAX_PAYLOAD:
            return JsonResponse({"error": "payload_too_large"}, status=413)
        if not easypost.valid_signature(body, request.META.get("HTTP_X_HMAC_SIGNATURE", ""), unseal(config.encrypted_webhook_secret)):
            return JsonResponse({"error": "invalid_signature"}, status=401)
        try:
            payload = json.loads(body)
        except ValueError:
            return JsonResponse({"error": "invalid_json"}, status=400)
        if not isinstance(payload, dict):
            return JsonResponse({"error": "invalid_payload"}, status=400)
        status, _ = handle_provider_event(config, payload, hashlib.sha256(body).hexdigest())
        if status == "invalid":
            return JsonResponse({"error": "missing_event_fields"}, status=400)
        # Always acknowledge a verified event: the provider retries anything else.
        return JsonResponse({"status": status}, status=200)
