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


class BuyerFacingPriceSerializer(serializers.ModelSerializer):
    """
    Buyer-safe view of a price.

    Exposes only what a buyer is allowed to see: the product it belongs to, the
    channel, the price the buyer pays and its bindability. Vendor wholesale
    price, commissions and markup are never included.
    """
    product_name = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()

    class Meta:
        model = EffectivePriceSnapshot
        fields = [
            "id", "product_reference", "product_name", "sku", "channel",
            "buyer_facing_price", "currency", "bindability_status",
            "valid_from", "is_current",
        ]
        read_only_fields = fields

    def _product(self, obj):
        products = self.context.get("bulk_products")
        if not products:
            return None
        return products.get(str(obj.product_reference))

    def get_product_name(self, obj):
        product = self._product(obj)
        return product["name"] if product else ""

    def get_sku(self, obj):
        product = self._product(obj)
        return product["sku"] if product else ""


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

    def get_queryset(self):
        """
        A pricing profile belongs to a vendor and a buyer — a user may only
        ever see the profiles of their own company.
        """
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return PricingProfile.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return qs

        company = getattr(user, "company", None) or (
            user.entity.company if getattr(user, "entity", None) else None
        )
        if not company:
            return PricingProfile.objects.none()
        if company.company_type == "vendor":
            return qs.filter(vendor_company_reference=company.id)
        return qs.filter(buyer_company_reference=company.id)


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

    def get_queryset(self):
        """
        Snapshots carry vendor wholesale price and commission amounts, so they
        are scoped to the owning vendor. Buyers read prices through the
        buyer-facing endpoint instead.
        """
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return EffectivePriceSnapshot.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return qs

        company = getattr(user, "company", None) or (
            user.entity.company if getattr(user, "entity", None) else None
        )
        if not company:
            return EffectivePriceSnapshot.objects.none()
        if company.company_type == "vendor":
            return qs.filter(pricing_profile__vendor_company_reference=company.id)
        # Buyers must not read the raw snapshot stream.
        return EffectivePriceSnapshot.objects.none()

    @action(detail=False, methods=["get"])
    def for_product(self, request):
        """Get current price snapshots for a specific product across all channels."""
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"error": "product_id required"}, status=400)
        snapshots = self.get_queryset().filter(product_reference=product_id)
        return Response(EffectivePriceSnapshotSerializer(snapshots, many=True).data)


class BuyerFacingPriceViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    """
    Prices a buyer is allowed to see.

    A price is visible to a buyer only when a
    BuyerFacingPricingVisibilityEvidence row grants visibility for that
    buyer's company and channel. There is no fallback to catalog pricing — if
    the evidence is missing the buyer simply does not see the price.

    Only buyer-safe fields are exposed (no vendor wholesale price, no
    commission, no markup).
    """
    serializer_class = BuyerFacingPriceSerializer
    action_capability_map = {
        "list": "pricing.buyer_price.list",
        "retrieve": "pricing.buyer_price.list",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["channel", "product_reference"]
    _rows = None

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return EffectivePriceSnapshot.objects.none()

        company = getattr(user, "company", None) or (
            user.entity.company if getattr(user, "entity", None) else None
        )
        if not company or company.company_type != "buyer":
            return EffectivePriceSnapshot.objects.none()

        granted_snapshot_ids = BuyerFacingPricingVisibilityEvidence.objects.filter(
            company_scope_reference=company.id,
            visibility_granted=True,
            redaction_decision="allowed",
        ).values_list("snapshot_id", flat=True)

        return EffectivePriceSnapshot.objects.filter(
            id__in=granted_snapshot_ids
        ).select_related("pricing_profile").order_by("-valid_from")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Resolve the product name / SKU for the page in one query.
        product_ids = {
            str(obj.product_reference)
            for obj in (self._rows or [])
        }
        products = {}
        if product_ids:
            from apps.catalog.models import Product
            for product in Product.objects.filter(id__in=product_ids).values("id", "name", "sku"):
                products[str(product["id"])] = product
        ctx["bulk_products"] = products
        return ctx

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        self._rows = page if page is not None else list(queryset)
        serializer = self.get_serializer(self._rows, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        self._rows = list(self.get_queryset().filter(pk=kwargs.get("pk")))
        serializer = self.get_serializer(self._rows, many=True)
        if not self._rows:
            from rest_framework.exceptions import NotFound
            raise NotFound()
        return Response(serializer.data[0])


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

    def get_queryset(self):
        """
        A commission agreement belongs to a vendor — a buyer must never see a
        vendor's commission terms.
        """
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return VendorCommissionAgreement.objects.none()
        if getattr(user, "is_cixci_admin", False):
            return qs

        company = getattr(user, "company", None) or (
            user.entity.company if getattr(user, "entity", None) else None
        )
        if not company:
            return VendorCommissionAgreement.objects.none()
        if company.company_type == "vendor":
            return qs.filter(vendor_company_reference=company.id)
        return VendorCommissionAgreement.objects.none()

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
router.register("buyer-prices", BuyerFacingPriceViewSet, basename="buyer-facing-price")
router.register("agreements", VendorCommissionAgreementViewSet, basename="vendor-agreement")
router.register("exceptions", MapExceptionViewSet, basename="map-exception")

urlpatterns = [path("", include(router.urls))]

