"""Order Routing — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin, BuyerScopedQuerysetMixin
from .models import (
    Order, RoutedSuborder,
    VendorExportSchedule, VendorExportWindow,
    VendorExportBatchItem, VendorExportDeliveryEvidence,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id", "company_scope_reference", "buyer_reference", "buyer_entity_reference",
            "status", "pricing_snapshot_references", "placed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "placed_at"]


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["pricing_snapshot_references"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Order.objects.create(
            company_scope_reference=user.entity.company_id,
            buyer_reference=user.id,
            buyer_entity_reference=user.entity_id,
            **validated_data,
        )


class RoutedSuborderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutedSuborder
        fields = [
            "id", "order", "vendor_company_reference",
            "status", "routing_snapshot", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorExportSchedule
        fields = [
            "id", "vendor_company_reference", "status",
            "delivery_method", "schedule_cron", "window_duration_minutes",
            "schedule_timezone", "effective_from", "effective_to", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorExportWindow
        fields = [
            "id", "schedule", "vendor_company_reference",
            "status", "opens_at", "closes_at", "item_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorExportDeliveryEvidenceSerializer(serializers.ModelSerializer):
    """
    READ-ONLY for Fulfillment/Returns.
    'confirmed' = delivery confirmed for configured method ONLY.
    Does NOT mean vendor acceptance. Fulfillment owns operational decisions.
    """
    class Meta:
        model = VendorExportDeliveryEvidence
        fields = [
            "id", "window", "vendor_company_reference",
            "status", "delivery_method",
            "confirmed_at", "failed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class OrderViewSet(BuyerScopedQuerysetMixin, viewsets.ModelViewSet):
    action_capability_map = {
        "list": "routing.order.list",
        "retrieve": "routing.order.read",
        "create": "routing.order.create",
        "update": "routing.order.update",
        "partial_update": "routing.order.update",
        "destroy": "routing.order.cancel",
        "suborders": "routing.order.read",
    }
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status"]
    ordering = ["-placed_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.all()
        if not user.is_cixci_admin:
            qs = qs.filter(
                buyer_reference=user.id,
                company_scope_reference=user.entity.company_id,
            )
        return qs

    def get_serializer_class(self):
        return OrderCreateSerializer if self.action == "create" else OrderSerializer

    @action(detail=True, methods=["get"])
    def suborders(self, request, pk=None):
        """List routed suborders for an order."""
        order = self.get_object()
        subs = order.routed_suborders.all()
        return Response(RoutedSuborderSerializer(subs, many=True).data)


class VendorExportScheduleViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorExportSchedule.objects.all()
    serializer_class = VendorExportScheduleSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
        "create": "routing.export.manage",
        "update": "routing.export.manage",
        "partial_update": "routing.export.manage",
        "destroy": "routing.export.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]


class VendorExportWindowViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VendorExportWindow.objects.select_related("schedule")
    serializer_class = VendorExportWindowSerializer
    action_capability_map = {
        "list": "routing.export.list",
        "retrieve": "routing.export.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    @action(detail=True, methods=["get"])
    def delivery_evidence(self, request, pk=None):
        """Delivery evidence for this window (read-only reference for Fulfillment)."""
        window = self.get_object()
        try:
            return Response(VendorExportDeliveryEvidenceSerializer(window.delivery_evidence).data)
        except VendorExportDeliveryEvidence.DoesNotExist:
            return Response({"detail": "No delivery evidence yet."}, status=404)


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("export-schedules", VendorExportScheduleViewSet, basename="export-schedule")
router.register("export-windows", VendorExportWindowViewSet, basename="export-window")

urlpatterns = [path("", include(router.urls))]
