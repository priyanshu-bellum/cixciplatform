"""Invoice Management — Serializers + ViewSets + URLs"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tenant.mixins import CheckAccessMixin
from .models import (
    InvoiceRun, InvoicePeriod, Invoice, InvoiceLine, InvoiceAdjustment,
    InvoiceExceptionRecord, InvoiceReport,
    VendorReconciliationUploadJob, VendorReconciliationMatchResult,
)


# ─── Serializers ──────────────────────────────────────────────────────────────

class InvoiceRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceRun
        fields = [
            "id", "status", "company_scope_reference", "run_label",
            "idempotency_key", "scheduled_for", "started_at", "completed_at",
            "error_detail", "created_at",
        ]
        read_only_fields = ["id", "created_at", "started_at", "completed_at"]


class InvoicePeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoicePeriod
        fields = [
            "id", "run", "company_scope_reference",
            "period_start", "period_end", "channel",
            "is_closed", "closed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_type", "status",
            "counterparty_role", "counterparty_reference",
            "grand_total", "currency", "issued_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [
            "id", "created_at", "updated_at",
            "quickbooks_payment_status_reference", "auto_payment_submitted",
        ]


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = [
            "id", "invoice", "idempotency_key",
            "source_module", "source_order_line_reference",
            "source_product_reference", "source_pricing_snapshot_reference",
            "unit_price_snapshot", "quantity", "line_total", "currency",
            "line_description", "created_at",
        ]
        read_only_fields = ["id", "created_at"]  # immutable after creation


class InvoiceAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceAdjustment
        fields = [
            "id", "invoice", "original_line",
            "adjustment_kind", "amount", "currency",
            "reason", "evidence_reference", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReconciliationUploadJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorReconciliationUploadJob
        fields = [
            "id", "invoice", "vendor_company_reference", "status",
            "file_reference", "row_count", "matched_count", "unmatched_count",
            "uploaded_at", "completed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReconciliationMatchResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorReconciliationMatchResult
        fields = [
            "id", "upload_job", "invoice_line", "match_result_status",
            "cixci_line_total", "vendor_reported_total", "vendor_line_reference",
            "variance_amount", "resolution_note", "resolved_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class InvoiceRunViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = InvoiceRun.objects.all()
    serializer_class = InvoiceRunSerializer
    action_capability_map = {
        "list": "invoicing.run.list",
        "retrieve": "invoicing.run.read",
        "create": "invoicing.run.create",
        "update": "invoicing.run.manage",
        "partial_update": "invoicing.run.manage",
        "destroy": "invoicing.run.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "company_scope_reference"]


class InvoiceViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("run", "period")
    action_capability_map = {
        "list": "invoicing.invoice.list",
        "retrieve": "invoicing.invoice.read",
        "create": "invoicing.invoice.create",
        "update": "invoicing.invoice.update",
        "partial_update": "invoicing.invoice.update",
        "destroy": "invoicing.invoice.manage",
        "lines": "invoicing.invoice.read",
        "adjustments": "invoicing.invoice.read",
        "reconciliation": "invoicing.reconciliation.read",
    }
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = [
        "invoice_type", "status", "counterparty_reference",
        "company_scope_reference",
    ]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return InvoiceDetailSerializer if self.action == "retrieve" else InvoiceListSerializer

    @action(detail=True, methods=["get"])
    def lines(self, request, pk=None):
        """Invoice lines — immutable after creation."""
        invoice = self.get_object()
        return Response(InvoiceLineSerializer(invoice.lines.all(), many=True).data)

    @action(detail=True, methods=["get"])
    def adjustments(self, request, pk=None):
        """Adjustments applied to this invoice."""
        invoice = self.get_object()
        return Response(InvoiceAdjustmentSerializer(invoice.adjustments.all(), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def reconciliation(self, request, pk=None):
        """
        Vendor reconciliation upload jobs for this invoice.
        Core rule: vendor file is comparison evidence — NOT source truth.
        """
        invoice = self.get_object()
        if request.method == "GET":
            jobs = invoice.reconciliation_jobs.all()
            return Response(ReconciliationUploadJobSerializer(jobs, many=True).data)
        # POST: create a new reconciliation upload job
        result = check_access(request.user, "invoicing.reconciliation.upload")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        
        company_id = request.user.entity.company_id if request.user.entity else None
        if not company_id:
            from apps.tenant.models import Company
            company = Company.objects.filter(company_type="vendor").first() or Company.objects.first()
            if company:
                company_id = company.id
                
        job = VendorReconciliationUploadJob.objects.create(
            invoice=invoice,
            vendor_company_reference=company_id,
            uploaded_by=request.user.id,
        )
        return Response(ReconciliationUploadJobSerializer(job).data, status=201)

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        """Mark an invoice as issued."""
        result = check_access(request.user, "invoicing.invoice.issue")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        from django.utils import timezone
        invoice = self.get_object()
        if invoice.status not in ["ready", "draft"]:
            return Response({"error": f"Cannot issue invoice in status '{invoice.status}'"}, status=400)
        invoice.status = "issued"
        invoice.issued_at = timezone.now()
        invoice.save(update_fields=["status", "issued_at", "updated_at"])
        return Response({"status": "issued", "issued_at": invoice.issued_at})


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("runs", InvoiceRunViewSet, basename="invoice-run")
router.register("invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [path("", include(router.urls))]
