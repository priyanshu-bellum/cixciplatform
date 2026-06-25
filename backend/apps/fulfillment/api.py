"""Fulfillment & Returns — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin
from .models import (
    FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy, SLAEvaluationRecord,
    LateFulfillmentImportException, MissingFulfillmentImportException,
    SLAOverrideExcuseEvidence, DeliveryDateEvidence, BuyerUpdateReadySignal,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class FulfillmentHandoffSerializer(serializers.ModelSerializer):
    class Meta:
        model = FulfillmentHandoff
        fields = [
            "id", "routed_suborder_reference", "vendor_company_reference",
            "company_scope_reference", "status", "delivery_evidence_reference",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorFulfillmentResponseSLAPolicy
        fields = [
            "id", "vendor_company_reference", "status",
            "response_window_hours", "partial_threshold_percent",
            "effective_from", "effective_to", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAEvaluationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAEvaluationRecord
        fields = [
            "id", "handoff", "sla_policy",
            "delivery_evidence_reference", "expected_response_by",
            "fulfillment_import_received_timestamp",
            "outcome", "evaluated_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable after creation


class LateFulfillmentExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LateFulfillmentImportException
        fields = [
            "id", "sla_evaluation", "status",
            "actual_import_received_at", "delay_hours", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MissingFulfillmentExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MissingFulfillmentImportException
        fields = [
            "id", "sla_evaluation", "status",
            "late_arrival_reference", "closed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SLAOverrideEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAOverrideExcuseEvidence
        fields = [
            "id", "sla_evaluation", "exception_type", "exception_reference",
            "override_reason", "override_category",
            "actor_reference", "reversal_reference", "is_reversal", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable


class DeliveryDateEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryDateEvidence
        fields = [
            "id", "handoff", "shipment_line_reference",
            "vendor_reported_delivery_date", "validation_outcome",
            "triggers_delivered_state", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BuyerUpdateSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerUpdateReadySignal
        fields = [
            "id", "order_reference", "buyer_reference",
            "update_kind", "status",
            "expected_vendor_count", "confirmed_vendor_count",
            "all_vendors_confirmed", "dispatched_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class FulfillmentHandoffViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = FulfillmentHandoff.objects.all()
    serializer_class = FulfillmentHandoffSerializer
    action_capability_map = {
        "list": "fulfillment.handoff.list",
        "retrieve": "fulfillment.handoff.read",
        "create": "fulfillment.handoff.create",
        "update": "fulfillment.handoff.update",
        "partial_update": "fulfillment.handoff.update",
        "destroy": "fulfillment.handoff.manage",
        "sla_evaluations": "fulfillment.sla.read",
        "delivery_dates": "fulfillment.handoff.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]

    @action(detail=True, methods=["get"])
    def sla_evaluations(self, request, pk=None):
        """SLA evaluation records for this handoff."""
        handoff = self.get_object()
        evals = handoff.sla_evaluations.select_related("sla_policy").all()
        return Response(SLAEvaluationRecordSerializer(evals, many=True).data)

    @action(detail=True, methods=["get"])
    def delivery_dates(self, request, pk=None):
        """Delivery date evidence for this handoff."""
        handoff = self.get_object()
        evidence = handoff.delivery_date_evidence.all()
        return Response(DeliveryDateEvidenceSerializer(evidence, many=True).data)


class SLAPolicyViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = VendorFulfillmentResponseSLAPolicy.objects.all()
    serializer_class = SLAPolicySerializer
    action_capability_map = {
        "list": "fulfillment.sla.list",
        "retrieve": "fulfillment.sla.read",
        "create": "fulfillment.sla.manage",
        "update": "fulfillment.sla.manage",
        "partial_update": "fulfillment.sla.manage",
        "destroy": "fulfillment.sla.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vendor_company_reference", "status"]


class SLAOverrideViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    """
    Immutable SLA override records.
    Reversal = new record with is_reversal=True.
    Never mutate an existing record.
    """
    queryset = SLAOverrideExcuseEvidence.objects.all()
    serializer_class = SLAOverrideEvidenceSerializer
    action_capability_map = {
        "list": "fulfillment.sla.list",
        "retrieve": "fulfillment.sla.read",
        "create": "fulfillment.sla.override",
    }
    http_method_names = ["get", "post", "head", "options"]  # No PUT/PATCH/DELETE


class BuyerUpdateSignalViewSet(CheckAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = BuyerUpdateReadySignal.objects.all()
    serializer_class = BuyerUpdateSignalSerializer
    action_capability_map = {
        "list": "fulfillment.buyer_signal.list",
        "retrieve": "fulfillment.buyer_signal.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["order_reference", "update_kind", "status"]


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("handoffs", FulfillmentHandoffViewSet, basename="handoff")
router.register("sla-policies", SLAPolicyViewSet, basename="sla-policy")
router.register("sla-overrides", SLAOverrideViewSet, basename="sla-override")
router.register("buyer-signals", BuyerUpdateSignalViewSet, basename="buyer-signal")

urlpatterns = [path("", include(router.urls))]
