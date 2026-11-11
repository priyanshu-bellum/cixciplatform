"""Governed region setup and current authorized entity readiness."""
import json
import uuid
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.audit.models import AuditRecord
from .mixins import CheckAccessMixin
from .models import OperatingRegion
from .services import check_access
from .regional_visibility import invalidate_regional_projections, regional_setup_status


class OperatingRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperatingRegion
        fields = ["id", "code", "name", "is_active"]

    def validate_code(self, value):
        from .country_regions import normalize_country_code
        value = normalize_country_code(value) or value
        if self.instance and value != self.instance.code:
            raise serializers.ValidationError("Canonical region codes are immutable; edit the display name instead.")
        duplicates = OperatingRegion.objects.filter(code__iexact=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("This canonical region identity already exists.")
        return value


class OperatingRegionViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = OperatingRegion.objects.all()
    serializer_class = OperatingRegionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]
    action_capability_map = {"list": "catalog.product.read", "retrieve": "catalog.product.read", "context": "catalog.product.read", "vendors": "catalog.product.read", "countries": "catalog.product.read",
                             "create": "tenant.company.update", "partial_update": "tenant.company.update"}

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ("GET", "HEAD", "OPTIONS") and check_access(request.user, "tenant.company.update").reason != "cixci_admin":
            raise PermissionDenied("Only CIXCI System Admin can govern Operating Regions.")

    @transaction.atomic
    def perform_create(self, serializer):
        self._save(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        self._save(serializer)

    def _save(self, serializer):
        before = OperatingRegionSerializer(serializer.instance).data if serializer.instance else None
        record = serializer.save()
        AuditRecord.objects.create(
            event_code="tenant.operating_region.configured", event_description=json.dumps({"before": before, "after": serializer.data}),
            status="success", actor_reference=self.request.user.id,
            company_scope_reference=self.request.user.entity.company_id if self.request.user.entity else uuid.UUID(int=0),
            source_module="tenant", source_record_type="OperatingRegion", source_record_id=record.id,
        )
        invalidate_regional_projections()

    @action(detail=False, methods=["get"])
    def countries(self, request):
        from .country_regions import COUNTRIES
        return Response(sorted(COUNTRIES.values(), key=lambda row: row["name"]))

    @action(detail=False, methods=["get"])
    def context(self, request):
        entity = request.user.entity
        if not entity or entity.company.company_type != "buyer":
            return Response({"status": "not_applicable"})
        return Response(regional_setup_status(entity.company_id, entity.id))

    @action(detail=False, methods=["get"])
    def vendors(self, request):
        from .models import Company
        from .regional_visibility import eligible_vendor_rules, effective_regional_fees
        entity = request.user.entity
        if not entity or entity.company.company_type != "buyer":
            raise PermissionDenied("Select an authorized Buyer Entity context.")
        region, rules = eligible_vendor_rules(entity.company_id, entity.id)
        fees = {fee.vendor_company_reference: fee for fee in effective_regional_fees(rules, region.code)} if region else {}
        results = []
        for vendor in Company.objects.filter(pk__in=rules).order_by("name"):
            fee = fees[vendor.id]
            results.append({"id": str(vendor.id), "name": vendor.display_name or vendor.name,
                "region_code": region.code, "fee_amount": str(fee.fee_amount), "currency": fee.currency,
                "fee_type": fee.fee_type})
        return Response({**regional_setup_status(entity.company_id, entity.id, resolved=(region, rules)), "results": results})
