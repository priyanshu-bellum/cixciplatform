"""Buyer webhook endpoint administration.

Like B2B API keys, an endpoint is set up by a CIXCI System Admin for a buyer
company; the buyer's own users can see their endpoint and its delivery log.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tenant.models import Company
from .buyer_webhooks import (BuyerWebhookDelivery, BuyerWebhookEndpoint, EVENT_TYPES, audit, new_secret, process_delivery,
                             queue_buyer_event, seal)
from .catalog_transport import CatalogTransportError, public_target


class EndpointSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    events = serializers.SerializerMethodField()

    class Meta:
        model = BuyerWebhookEndpoint
        fields = ["id", "company", "company_name", "url", "is_active", "events", "created_at", "updated_at"]
        read_only_fields = fields

    def get_events(self, obj):
        return [event for event in EVENT_TYPES if event != "webhook.test"]


class EndpointWriteSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.filter(company_type="buyer"))
    url = serializers.URLField(max_length=1000)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_url(self, value):
        try:
            public_target(value, resolve=False)
        except (CatalogTransportError, DjangoValidationError, ValueError):
            raise serializers.ValidationError("Use a public https:// address without port, query string or credentials.")
        return value


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerWebhookDelivery
        fields = ["id", "event_type", "status", "attempt_count", "last_response_code", "last_error", "next_retry_at",
                  "delivered_at", "created_at"]


class BuyerWebhookViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EndpointSerializer
    queryset = BuyerWebhookEndpoint.objects.none()

    def get_queryset(self):
        user = self.request.user
        rows = BuyerWebhookEndpoint.objects.select_related("company")
        if getattr(user, "is_cixci_admin", False):
            return rows
        company_id = getattr(getattr(user, "entity", None), "company_id", None)
        return rows.filter(company_id=company_id) if company_id else rows.none()

    def _admin(self):
        if not getattr(self.request.user, "is_cixci_admin", False):
            raise PermissionDenied("Buyer webhooks are set up by CIXCI System Admins.")

    def list(self, request):
        return Response(EndpointSerializer(self.get_queryset().order_by("company__name"), many=True).data)

    def create(self, request):
        """Create or update the endpoint of one buyer company. The secret is shown once, on creation."""
        self._admin()
        serializer = EndpointWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        endpoint = BuyerWebhookEndpoint.objects.filter(company=data["company"]).first()
        secret = None
        if endpoint is None:
            secret = new_secret()
            endpoint = BuyerWebhookEndpoint.objects.create(company=data["company"], url=data["url"], is_active=data["is_active"],
                encrypted_secret=seal(secret), updated_by=request.user)
            audit("created", request.user, endpoint.company_id, endpoint_id=str(endpoint.pk), url=endpoint.url)
        else:
            before = {"url": endpoint.url, "is_active": endpoint.is_active}
            endpoint.url, endpoint.is_active, endpoint.updated_by = data["url"], data["is_active"], request.user
            endpoint.save()
            audit("updated", request.user, endpoint.company_id, endpoint_id=str(endpoint.pk), before=before,
                  after={"url": endpoint.url, "is_active": endpoint.is_active})
        body = EndpointSerializer(endpoint).data
        if secret:
            body["signing_secret"] = secret
        return Response(body, status=201 if secret else 200)

    @action(detail=True, methods=["post"], url_path="rotate-secret")
    def rotate_secret(self, request, pk=None):
        self._admin()
        endpoint = self.get_object()
        secret = new_secret()
        endpoint.encrypted_secret, endpoint.updated_by = seal(secret), request.user
        endpoint.save()
        audit("secret_rotated", request.user, endpoint.company_id, endpoint_id=str(endpoint.pk))
        return Response({**EndpointSerializer(endpoint).data, "signing_secret": secret})

    def destroy(self, request, pk=None):
        self._admin()
        endpoint = self.get_object()
        audit("deleted", request.user, endpoint.company_id, endpoint_id=str(endpoint.pk), url=endpoint.url)
        endpoint.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """Send a signed test event now and report what the buyer's server answered."""
        self._admin()
        endpoint = self.get_object()
        if not endpoint.is_active:
            raise serializers.ValidationError({"detail": "Activate the endpoint before testing it."})
        delivery = queue_buyer_event(endpoint.company_id, "webhook.test", {"message": "CIXCI webhook test"})
        if delivery is None:
            raise serializers.ValidationError({"detail": "The buyer company is not active."})
        process_delivery(delivery.pk)
        delivery.refresh_from_db()
        audit("tested", request.user, endpoint.company_id, endpoint_id=str(endpoint.pk), result=delivery.status)
        return Response(DeliverySerializer(delivery).data)

    @action(detail=True, methods=["get"])
    def deliveries(self, request, pk=None):
        endpoint = self.get_object()
        return Response(DeliverySerializer(endpoint.deliveries.all()[:100], many=True).data)
