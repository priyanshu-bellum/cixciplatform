"""Pricing — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin
from .models import (
    PricingProfile, EffectivePriceSnapshot,
    BuyerFacingPricingVisibilityEvidence, POPricingBindability,
    VendorCommissionAgreement, MapException,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class MapExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapException
        fields = [
            "id", "vendor_company_reference", "product_reference", "sku",
            "buyer_company_reference", "approved_minimum_price", "start_date",
            "end_date", "status", "approval_notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

class PricingProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingProfile
        fields = [
            "id", "vendor_company_reference", "buyer_company_reference",
            "channel", "status",
            "vendor_side_commission_rate", "buyer_side_commission_rate",
            "markup_rate", "currency", "rounding_rule",
            "order_bindable", "procurement_bindable",
            "effective_from", "effective_to", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EffectivePriceSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = EffectivePriceSnapshot
        fields = [
            "id", "product_reference", "channel",
            "vendor_wholesale_price",
            "vendor_side_commission_amount", "buyer_side_commission_amount",
            "buyer_facing_price", "currency",
            "bindability_status", "procurement_bindable", "invoice_bindable",
            "valid_from", "valid_to", "is_current",
            "superseded_by_snapshot", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable after creation


class BuyerVisibilityEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerFacingPricingVisibilityEvidence
        fields = [
            "id", "snapshot", "buyer_reference", "channel",
            "redaction_decision", "recheck_before_display",
            "visibility_granted", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VendorCommissionAgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCommissionAgreement
        fields = [
            "id", "vendor_company_reference", "commission_percentage",
            "status", "approved_at", "approved_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class PricingProfileViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = PricingProfile.objects.all()
    serializer_class = PricingProfileSerializer
    action_capability_map = {
        "list": "pricing.profile.list",
        "retrieve": "pricing.profile.read",
        "create": "pricing.profile.create",
        "update": "pricing.profile.update",
        "partial_update": "pricing.profile.update",
        "destroy": "pricing.profile.delete",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "channel", "status"]


class EffectivePriceSnapshotViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    """
    Price snapshots are READ-ONLY for all consumers.
    Pricing module creates them internally — no external creation allowed.
    """
    queryset = EffectivePriceSnapshot.objects.filter(is_current=True)
    serializer_class = EffectivePriceSnapshotSerializer
    action_capability_map = {
        "list": "pricing.snapshot.list",
        "retrieve": "pricing.snapshot.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product_reference", "channel", "bindability_status"]

    @action(detail=False, methods=["get"])
    def for_product(self, request):
        """Get current price snapshots for a specific product across all channels."""
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"error": "product_id required"}, status=400)
        snapshots = self.get_queryset().filter(product_reference=product_id)
        return Response(EffectivePriceSnapshotSerializer(snapshots, many=True).data)


class VendorCommissionAgreementViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorCommissionAgreement.objects.all()
    serializer_class = VendorCommissionAgreementSerializer
    action_capability_map = {
        "list": "pricing.agreement.list",
        "retrieve": "pricing.agreement.read",
        "create": "pricing.agreement.create",
        "update": "pricing.agreement.update",
        "partial_update": "pricing.agreement.update",
        "destroy": "pricing.agreement.delete",
        "approve": "pricing.agreement.approve",
    }

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not request.user.is_cixci_admin:
            return Response({"error": "Only CIXCI system admins can approve agreements."}, status=403)
        from django.utils import timezone
        agreement = self.get_object()
        agreement.status = "approved"
        agreement.approved_at = timezone.now()
        agreement.approved_by = request.user.id
        agreement.save()
        return Response(VendorCommissionAgreementSerializer(agreement).data)


class MapExceptionViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = MapException.objects.all()
    serializer_class = MapExceptionSerializer
    action_capability_map = {
        "list": "pricing.exception.list",
        "retrieve": "pricing.exception.read",
        "create": "pricing.exception.create",
        "update": "pricing.exception.update",
        "partial_update": "pricing.exception.update",
        "destroy": "pricing.exception.delete",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "sku", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return MapException.objects.none()
        if user.is_cixci_admin:
            return qs
        company = user.company
        if not company:
            return MapException.objects.none()
            
        if company.company_type == "vendor":
            return qs.filter(vendor_company_reference=company.id)
        else:
            return qs.filter(buyer_company_reference=company.id)


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("profiles", PricingProfileViewSet, basename="pricing-profile")
router.register("snapshots", EffectivePriceSnapshotViewSet, basename="price-snapshot")
router.register("agreements", VendorCommissionAgreementViewSet, basename="vendor-agreement")
router.register("exceptions", MapExceptionViewSet, basename="map-exception")

urlpatterns = [path("", include(router.urls))]

