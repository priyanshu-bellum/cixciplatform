"""Invoice Management — Serializers + ViewSets + URLs"""
import logging
import uuid
from decimal import Decimal, InvalidOperation

from rest_framework import serializers, viewsets, filters, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.db import transaction

from apps.tenant.mixins import CheckAccessMixin
from apps.tenant.services import check_access
from django.db.models import Q
from .models import (
    InvoiceRun, InvoiceRunStatus, InvoiceStatus,
    InvoicePeriod, Invoice, InvoiceLine, InvoiceAdjustment,
    InvoiceExceptionRecord, InvoiceReport,
    VendorReconciliationUploadJob, VendorReconciliationMatchResult,
)

logger = logging.getLogger(__name__)

# ─── State Machine: valid transitions ────────────────────────────────────────

INVOICE_RUN_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"scheduled", "queued", "running", "cancelled"},
    "scheduled": {"queued", "running", "cancelled"},
    "queued": {"initializing", "cancelled"},
    "initializing": {"running", "failed", "cancelled"},
    "running": {"paused", "partially_complete", "complete", "failed"},
    "paused": {"running", "cancelled"},
    "partially_complete": {"running", "complete", "failed", "pending_review"},
    "pending_review": {"complete", "cancelled", "running"},
    "complete": {"archived", "superseded"},
    "failed": {"rolled_back", "draft"},
    "rolled_back": {"draft"},
    "validation_failed": {"draft", "cancelled"},
    "cancelled": set(),
    "superseded": {"archived"},
    "archived": set(),
}

INVOICE_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"pending_validation", "ready", "void"},
    "pending_validation": {"validation_failed", "ready"},
    "validation_failed": {"draft", "void"},
    "ready": {"issued", "void"},
    "issued": {"sent", "disputed", "void", "superseded"},
    "sent": {"acknowledged", "disputed", "overdue", "void"},
    "acknowledged": {"partially_paid", "paid", "disputed", "overdue"},
    "disputed": {"acknowledged", "void", "superseded"},
    "partially_paid": {"paid", "overdue", "disputed"},
    "paid": {"archived"},
    "overdue": {"paid", "partially_paid", "void", "disputed"},
    "void": {"archived"},
    "superseded": {"archived"},
    "archived": set(),
}


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
    counterparty_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_type", "status",
            "counterparty_role", "counterparty_reference", "counterparty_name",
            "company_scope_reference", "company_name",
            "grand_total", "currency", "issued_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_counterparty_name(self, obj):
        try:
            from apps.tenant.models import Company
            c = Company.objects.filter(id=obj.counterparty_reference).first()
            return c.name if c else str(obj.counterparty_reference)[:8]
        except Exception:
            return str(obj.counterparty_reference)[:8]

    def get_company_name(self, obj):
        try:
            from apps.tenant.models import Company
            c = Company.objects.filter(id=obj.company_scope_reference).first()
            return c.name if c else str(obj.company_scope_reference)[:8]
        except Exception:
            return str(obj.company_scope_reference)[:8]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    counterparty_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [
            "id", "created_at", "updated_at",
            "quickbooks_payment_status_reference", "auto_payment_submitted",
        ]

    def get_counterparty_name(self, obj):
        try:
            from apps.tenant.models import Company
            c = Company.objects.filter(id=obj.counterparty_reference).first()
            return c.name if c else str(obj.counterparty_reference)[:8]
        except Exception:
            return str(obj.counterparty_reference)[:8]

    def get_company_name(self, obj):
        try:
            from apps.tenant.models import Company
            c = Company.objects.filter(id=obj.company_scope_reference).first()
            return c.name if c else str(obj.company_scope_reference)[:8]
        except Exception:
            return str(obj.company_scope_reference)[:8]


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


class InvoiceExceptionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceExceptionRecord
        fields = [
            "id", "run", "invoice", "exception_kind", "description",
            "source_reference", "is_blocking", "resolved", "resolved_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InvoiceReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceReport
        fields = [
            "id", "run", "report_type", "generated_at",
            "file_reference", "company_scope_reference",
        ]
        read_only_fields = ["id", "generated_at"]


class ReconciliationMatchResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorReconciliationMatchResult
        fields = [
            "id", "upload_job", "invoice_line", "match_result_status",
            "cixci_line_total", "vendor_reported_total", "vendor_line_reference",
            "variance_amount", "resolution_note", "resolved_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _validate_status_transition(current: str, new: str, transitions: dict) -> str | None:
    """Return error message if transition is invalid, else None."""
    allowed = transitions.get(current, set())
    if new not in allowed:
        return f"Invalid status transition: '{current}' → '{new}'. Allowed: {sorted(allowed) if allowed else 'none (terminal state)'}."
    return None


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
        "exceptions": "invoicing.run.read",
        "reports": "invoicing.run.read",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "company_scope_reference"]

    def get_queryset(self):
        user = self.request.user
        qs = InvoiceRun.objects.all()
        is_admin = getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )
        if is_admin:
            return qs
        if hasattr(user, "entity") and user.entity and user.entity.company:
            return qs.filter(company_scope_reference=user.entity.company.id)
        return qs

    def perform_update(self, serializer):
        """Enforce state machine transitions for InvoiceRun status changes."""
        instance = self.get_object()
        new_status = serializer.validated_data.get("status")
        if new_status and new_status != instance.status:
            error = _validate_status_transition(instance.status, new_status, INVOICE_RUN_TRANSITIONS)
            if error:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"status": error})
        serializer.save()

    @action(detail=True, methods=["get"])
    def exceptions(self, request, pk=None):
        """Exception records for this invoice run."""
        run = self.get_object()
        qs = run.exceptions.all().order_by("-created_at")
        resolved = request.query_params.get("resolved")
        if resolved is not None:
            qs = qs.filter(resolved=resolved.lower() == "true")
        return Response(InvoiceExceptionRecordSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def reports(self, request, pk=None):
        """Reports generated for this invoice run."""
        run = self.get_object()
        return Response(InvoiceReportSerializer(run.reports.all(), many=True).data)


class InvoiceViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("run", "period")
    action_capability_map = {
        "list": "invoicing.invoice.list",
        "retrieve": "invoicing.invoice.read",
        "create": "invoicing.invoice.create",
        "create_manual": "invoicing.invoice.create",
        "update": "invoicing.invoice.update",
        "partial_update": "invoicing.invoice.update",
        "destroy": "invoicing.invoice.manage",
        "lines": "invoicing.invoice.read",
        "adjustments": "invoicing.invoice.read",
        "reconciliation": "invoicing.reconciliation.read",
        "issue": "invoicing.invoice.issue",
    }
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = [
        "invoice_type", "status", "counterparty_reference",
        "company_scope_reference",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("run", "period")
        is_admin = getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )
        if is_admin:
            return qs
        if hasattr(user, "entity") and user.entity and user.entity.company:
            cid = user.entity.company.id
            direct = Q(company_scope_reference=cid) | Q(counterparty_reference=cid)
            # Vendor visibility: invoices containing lines sourced from this vendor's POs
            from apps.procurement.models import PurchaseOrderLine
            pol_ids = PurchaseOrderLine.objects.filter(
                purchase_order__vendor_company_reference=cid
            ).values_list("id", flat=True)
            indirect = Q(lines__source_order_line_reference__in=list(pol_ids))
            return qs.filter(direct | indirect).distinct()
        return qs

    def get_serializer_class(self):
        return InvoiceDetailSerializer if self.action == "retrieve" else InvoiceListSerializer

    def perform_update(self, serializer):
        """Enforce state machine transitions for Invoice status changes."""
        instance = self.get_object()
        new_status = serializer.validated_data.get("status")
        if new_status and new_status != instance.status:
            error = _validate_status_transition(instance.status, new_status, INVOICE_TRANSITIONS)
            if error:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"status": error})
        serializer.save()

    @action(detail=True, methods=["get"])
    def lines(self, request, pk=None):
        """Invoice lines — immutable after creation."""
        invoice = self.get_object()
        return Response(InvoiceLineSerializer(invoice.lines.all(), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def adjustments(self, request, pk=None):
        """Adjustments applied to this invoice. POST to create a new adjustment."""
        invoice = self.get_object()
        if request.method == "GET":
            return Response(InvoiceAdjustmentSerializer(invoice.adjustments.all(), many=True).data)
        # POST: create adjustment
        result = check_access(request.user, "invoicing.invoice.update")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        data = request.data.copy()
        data["invoice"] = invoice.id
        sz = InvoiceAdjustmentSerializer(data=data)
        sz.is_valid(raise_exception=True)
        sz.save()
        return Response(sz.data, status=201)

    @action(detail=True, methods=["get", "post"])
    def reconciliation(self, request, pk=None):
        """
        Vendor reconciliation upload jobs for this invoice.
        Core rule: vendor file is comparison evidence — NOT source truth.
        """
        invoice = self.get_object()
        if request.method == "GET":
            jobs = invoice.reconciliation_jobs.all().order_by("-created_at")
            return Response(ReconciliationUploadJobSerializer(jobs, many=True).data)
        # POST: create a new reconciliation upload job
        result = check_access(request.user, "invoicing.reconciliation.upload")
        if not result.granted:
            return Response({"error": result.reason}, status=403)

        company_id = None
        if hasattr(request.user, "entity") and request.user.entity:
            company_id = getattr(request.user.entity, "company_id", None)
        if not company_id:
            logger.warning(
                "reconciliation upload: user %s has no company association", request.user.id
            )
            return Response(
                {"error": "Your account is not associated with a company. Cannot create reconciliation job."},
                status=400,
            )

        job = VendorReconciliationUploadJob.objects.create(
            invoice=invoice,
            vendor_company_reference=company_id,
            uploaded_by=request.user.id,
        )
        return Response(ReconciliationUploadJobSerializer(job).data, status=201)

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        """Mark an invoice as issued (state machine enforced)."""
        result = check_access(request.user, "invoicing.invoice.issue")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        from django.utils import timezone
        invoice = self.get_object()
        error = _validate_status_transition(invoice.status, "issued", INVOICE_TRANSITIONS)
        if error:
            return Response({"error": error}, status=400)
        invoice.status = "issued"
        invoice.issued_at = timezone.now()
        invoice.save(update_fields=["status", "issued_at", "updated_at"])
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        """Generic status transition endpoint with state machine validation."""
        result = check_access(request.user, "invoicing.invoice.update")
        if not result.granted:
            return Response({"error": result.reason}, status=403)
        new_status = request.data.get("status")
        if not new_status:
            return Response({"error": "Missing 'status' field."}, status=400)
        invoice = self.get_object()
        error = _validate_status_transition(invoice.status, new_status, INVOICE_TRANSITIONS)
        if error:
            return Response({"error": error}, status=400)
        invoice.status = new_status
        invoice.save(update_fields=["status", "updated_at"])
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=False, methods=["post"], url_path="create-manual")
    def create_manual(self, request):
        """
        Create a complete invoice with lines in a single request.
        Handles Run + Period + Invoice + Lines atomically.

        Expected payload:
        {
            "invoice_type": "buyer_invoice",
            "counterparty_role": "buyer",
            "counterparty_reference": "<uuid>",
            "period_start": "2024-01-01",
            "period_end": "2024-01-31",
            "currency": "USD",
            "run_label": "Manual — Oct 2024",
            "lines": [
                { "description": "Case for iPhone 15", "quantity": 100, "unit_price": "12.50" },
                ...
            ]
        }
        """
        result = check_access(request.user, "invoicing.invoice.create")
        if not result.granted:
            return Response({"error": result.reason}, status=403)

        data = request.data
        # ── Validate required fields ──
        errors = {}
        for field in ("invoice_type", "counterparty_role", "counterparty_reference",
                       "period_start", "period_end"):
            if not data.get(field):
                errors[field] = "This field is required."
        lines = data.get("lines", [])
        if not lines:
            errors["lines"] = "At least one line item is required."
        for i, line in enumerate(lines):
            if not line.get("description"):
                errors[f"lines[{i}].description"] = "Description is required."
            try:
                qty = int(line.get("quantity", 0))
                if qty <= 0:
                    errors[f"lines[{i}].quantity"] = "Quantity must be positive."
            except (ValueError, TypeError):
                errors[f"lines[{i}].quantity"] = "Invalid quantity."
            try:
                price = Decimal(str(line.get("unit_price", 0)))
                if price < 0:
                    errors[f"lines[{i}].unit_price"] = "Unit price cannot be negative."
            except (InvalidOperation, TypeError):
                errors[f"lines[{i}].unit_price"] = "Invalid unit price."
        if errors:
            return Response({"errors": errors}, status=400)

        currency = data.get("currency", "USD")
        user_id = request.user.id
        company_id = None
        if hasattr(request.user, "entity") and request.user.entity and request.user.entity.company:
            company_id = request.user.entity.company.id
        elif hasattr(request.user, "company") and request.user.company:
            company_id = request.user.company.id
        if not company_id:
            company_id = data.get("counterparty_reference")

        try:
            with transaction.atomic():
                # 1) InvoiceRun
                run = InvoiceRun.objects.create(
                    status="draft",
                    company_scope_reference=company_id,
                    run_label=data.get("run_label", f"Manual — {data['period_start']} to {data['period_end']}"),
                    idempotency_key=f"manual-{uuid.uuid4()}",
                    created_by=user_id,
                )
                # 2) InvoicePeriod
                period = InvoicePeriod.objects.create(
                    run=run,
                    company_scope_reference=company_id,
                    period_start=data["period_start"],
                    period_end=data["period_end"],
                    channel=data.get("channel", ""),
                )
                # 3) Compute totals from lines
                subtotal = Decimal("0")
                line_objects = []
                for line in lines:
                    qty = int(line["quantity"])
                    price = Decimal(str(line["unit_price"]))
                    total = price * qty
                    subtotal += total
                    line_objects.append({
                        "description": line["description"],
                        "quantity": qty,
                        "unit_price": price,
                        "line_total": total,
                    })

                # 4) Invoice
                invoice = Invoice.objects.create(
                    run=run,
                    period=period,
                    company_scope_reference=company_id,
                    invoice_type=data["invoice_type"],
                    status="draft",
                    counterparty_role=data["counterparty_role"],
                    counterparty_reference=data["counterparty_reference"],
                    subtotal=subtotal,
                    commission_total=Decimal("0"),
                    adjustment_total=Decimal("0"),
                    grand_total=subtotal,
                    currency=currency,
                )
                # 5) InvoiceLines
                for i, lo in enumerate(line_objects):
                    InvoiceLine.objects.create(
                        invoice=invoice,
                        idempotency_key=f"{period.id}-{invoice.counterparty_reference}-manual-{i}",
                        source_module="manual",
                        source_order_line_reference=uuid.uuid4(),
                        source_pricing_snapshot_reference=uuid.uuid4(),
                        unit_price_snapshot=lo["unit_price"],
                        quantity=lo["quantity"],
                        line_total=lo["line_total"],
                        currency=currency,
                        line_description=lo["description"],
                    )
                # Mark run as complete
                run.status = "complete"
                run.save(update_fields=["status"])

            return Response(InvoiceDetailSerializer(invoice).data, status=201)
        except Exception as exc:
            logger.exception("Manual invoice creation failed: %s", exc)
            return Response({"error": str(exc)}, status=400)

    @action(detail=False, methods=["post"], url_path="create-from-orders")
    def create_from_orders(self, request):
        """
        Auto-generate invoice from PurchaseOrders in a date range for a buyer.
        CIXCI Admin only.
        Payload: { invoice_type, counterparty_reference, period_start, period_end, currency }
        Lines are aggregated by product. Zero-price lines create exception records.
        """
        result = check_access(request.user, "invoicing.invoice.create")
        if not result.granted:
            return Response({"error": result.reason}, status=403)

        data = request.data
        errors = {}
        for field in ("invoice_type", "counterparty_reference", "period_start", "period_end"):
            if not data.get(field):
                errors[field] = "This field is required."
        if errors:
            return Response({"errors": errors}, status=400)

        from datetime import datetime, date
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
        from apps.catalog.models import Product

        buyer_id = data["counterparty_reference"]
        try:
            period_start = date.fromisoformat(str(data["period_start"]))
            period_end = date.fromisoformat(str(data["period_end"]))
        except ValueError:
            return Response({"errors": {"period": "Invalid date format. Use YYYY-MM-DD."}}, status=400)

        if period_end < period_start:
            return Response({"errors": {"period": "Period end must be on or after period start."}}, status=400)

        currency = data.get("currency", "USD")

        EXCLUDED_STATUSES = [POStatus.DRAFT, POStatus.CANCELLED, POStatus.REJECTED]

        pos = PurchaseOrder.objects.filter(
            company_scope_reference=buyer_id,
            created_at__date__gte=period_start,
            created_at__date__lte=period_end,
        ).exclude(status__in=EXCLUDED_STATUSES).order_by("created_at")

        if not pos.exists():
            return Response(
                {"error": "No billable orders found for this buyer in the specified period."},
                status=400,
            )

        # Aggregate lines by product
        product_agg = {}
        exceptions = []

        for po in pos:
            po_lines = PurchaseOrderLine.objects.filter(purchase_order=po)
            for pol in po_lines:
                # Zero-price: both wholesale and MSRP are zero/missing
                _prod_for_zero = Product.objects.filter(id=pol.product_reference).first()
                _effective_msrp = pol.msrp_snapshot if pol.msrp_snapshot else (_prod_for_zero.msrp if _prod_for_zero and _prod_for_zero.msrp else None)
                if (pol.unit_price_snapshot == 0 or pol.unit_price_snapshot is None) and (_effective_msrp is None or _effective_msrp == 0):
                    exceptions.append({
                        "source_line_id": str(pol.id),
                        "reason": "missing_pricing_evidence",
                        "description": (
                            f"Order line {pol.id} for product {pol.product_reference} "
                            f"has zero unit price — no pricing snapshot evidence."
                        ),
                    })
                    continue

                prod_ref = str(pol.product_reference)
                prod = Product.objects.filter(id=pol.product_reference).first()
                desc = f"{prod.name} ({prod.sku})" if prod else f"Product {prod_ref}"

                # Invoice pricing = MSRP (client rule), fallback to wholesale snapshot
                invoice_unit_price = pol.msrp_snapshot if pol.msrp_snapshot else pol.unit_price_snapshot

                if prod_ref not in product_agg:
                    product_agg[prod_ref] = {
                        "description": desc,
                        "quantity": 0,
                        "unit_price": invoice_unit_price,
                        "line_total": Decimal("0"),
                        "product_reference": pol.product_reference,
                        "first_line_id": pol.id,
                        "snapshot_ref": po.pricing_snapshot_reference,
                    }
                product_agg[prod_ref]["quantity"] += pol.quantity
                product_agg[prod_ref]["line_total"] += pol.line_total

        if not product_agg:
            return Response(
                {
                    "error": "No billable lines found. All order lines have zero pricing.",
                    "exceptions": exceptions,
                },
                status=400,
            )

        user_id = request.user.id

        try:
            with transaction.atomic():
                run = InvoiceRun.objects.create(
                    status="draft",
                    company_scope_reference=buyer_id,
                    run_label=data.get(
                        "run_label",
                        f"Auto — {period_start.isoformat()} to {period_end.isoformat()}",
                    ),
                    idempotency_key=f"auto-{uuid.uuid4()}",
                    created_by=user_id,
                )
                period = InvoicePeriod.objects.create(
                    run=run,
                    company_scope_reference=buyer_id,
                    period_start=data["period_start"],
                    period_end=data["period_end"],
                )

                subtotal = Decimal("0")
                for agg in product_agg.values():
                    subtotal += agg["line_total"]

                invoice = Invoice.objects.create(
                    run=run,
                    period=period,
                    company_scope_reference=buyer_id,
                    invoice_type=data["invoice_type"],
                    status="draft",
                    counterparty_role="buyer",
                    counterparty_reference=buyer_id,
                    subtotal=subtotal,
                    commission_total=Decimal("0"),
                    adjustment_total=Decimal("0"),
                    grand_total=subtotal,
                    currency=currency,
                )

                for i, (prod_ref, agg) in enumerate(product_agg.items()):
                    InvoiceLine.objects.create(
                        invoice=invoice,
                        idempotency_key=f"{period.id}-{buyer_id}-auto-{prod_ref}-{i}",
                        source_module="procurement",
                        source_order_line_reference=agg["first_line_id"],
                        source_product_reference=agg["product_reference"],
                        source_pricing_snapshot_reference=agg["snapshot_ref"] or uuid.uuid4(),
                        unit_price_snapshot=agg["unit_price"],
                        quantity=agg["quantity"],
                        line_total=agg["line_total"],
                        currency=currency,
                        line_description=agg["description"],
                    )

                for exc in exceptions:
                    InvoiceExceptionRecord.objects.create(
                        run=run,
                        invoice=invoice,
                        exception_kind=exc["reason"],
                        description=exc["description"],
                        source_reference=uuid.UUID(exc["source_line_id"]),
                        is_blocking=False,
                    )

                run.status = "complete"
                run.save(update_fields=["status"])

            resp = InvoiceDetailSerializer(invoice).data
            resp["exceptions"] = exceptions
            return Response(resp, status=201)
        except Exception as exc:
            logger.exception("Auto invoice creation failed: %s", exc)
            return Response({"error": str(exc)}, status=400)

    @action(detail=False, methods=["get"], url_path="preview-from-orders")
    def preview_from_orders(self, request):
        """
        Preview eligible orders for auto-invoice generation.
        GET params: buyer_id, period_start, period_end
        Returns summary of matching POs and their lines.
        """
        result = check_access(request.user, "invoicing.invoice.create")
        if not result.granted:
            return Response({"error": result.reason}, status=403)

        buyer_id = request.query_params.get("buyer_id")
        period_start_str = request.query_params.get("period_start")
        period_end_str = request.query_params.get("period_end")

        errors = {}
        if not buyer_id:
            errors["buyer_id"] = "This field is required."
        if not period_start_str:
            errors["period_start"] = "This field is required."
        if not period_end_str:
            errors["period_end"] = "This field is required."
        if errors:
            return Response({"errors": errors}, status=400)

        from datetime import date
        from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
        from apps.catalog.models import Product

        try:
            period_start = date.fromisoformat(str(period_start_str))
            period_end = date.fromisoformat(str(period_end_str))
        except ValueError:
            return Response({"errors": {"period": "Invalid date format. Use YYYY-MM-DD."}}, status=400)

        EXCLUDED_STATUSES = [POStatus.DRAFT, POStatus.CANCELLED, POStatus.REJECTED]

        pos = PurchaseOrder.objects.filter(
            company_scope_reference=buyer_id,
            created_at__date__gte=period_start,
            created_at__date__lte=period_end,
        ).exclude(status__in=EXCLUDED_STATUSES).order_by("created_at")

        orders_summary = []
        total_amount = 0
        total_lines = 0
        zero_price_lines = 0

        for po in pos:
            po_lines = PurchaseOrderLine.objects.filter(purchase_order=po)
            lines_data = []
            for pol in po_lines:
                prod = Product.objects.filter(id=pol.product_reference).first()
                # Zero-price: both wholesale and MSRP are zero/missing
                effective_msrp = pol.msrp_snapshot if pol.msrp_snapshot else (prod.msrp if prod and prod.msrp else None)
                is_zero = (pol.unit_price_snapshot == 0 or pol.unit_price_snapshot is None) and (effective_msrp is None or effective_msrp == 0)
                if is_zero:
                    zero_price_lines += 1
                lines_data.append({
                    "line_id": str(pol.id),
                    "product_name": prod.name if prod else "Unknown",
                    "sku": prod.sku if prod else "",
                    "quantity": pol.quantity,
                    "unit_price": float(pol.unit_price_snapshot),
                    "msrp": float(effective_msrp) if effective_msrp else None,
                    "line_total": float(pol.line_total),
                    "is_zero_price": is_zero,
                })
                total_lines += 1
                if not is_zero:
                    total_amount += float(pol.line_total)

            orders_summary.append({
                "po_id": str(po.id),
                "po_number": po.po_number,
                "status": po.status,
                "created_at": po.created_at.isoformat() if po.created_at else None,
                "total_amount": float(po.total_amount) if po.total_amount else 0,
                "line_count": len(lines_data),
                "lines": lines_data,
            })

        from apps.tenant.models import Company
        buyer = Company.objects.filter(id=buyer_id).first()

        return Response({
            "buyer": {"id": str(buyer.id), "name": buyer.name} if buyer else None,
            "period_start": period_start_str,
            "period_end": period_end_str,
            "orders_count": len(orders_summary),
            "total_lines": total_lines,
            "zero_price_lines": zero_price_lines,
            "estimated_total": round(total_amount, 2),
            "orders": orders_summary,
        })


class InvoiceExceptionRecordViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    """Exception records across all runs. Filterable by run, blocking status, resolution."""
    queryset = InvoiceExceptionRecord.objects.all().order_by("-created_at")
    serializer_class = InvoiceExceptionRecordSerializer
    action_capability_map = {
        "list": "invoicing.exception.list",
        "retrieve": "invoicing.exception.read",
        "create": "invoicing.exception.create",
        "update": "invoicing.exception.manage",
        "partial_update": "invoicing.exception.manage",
        "destroy": "invoicing.exception.manage",
        "resolve": "invoicing.exception.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["run", "invoice", "is_blocking", "resolved", "exception_kind"]

    def get_queryset(self):
        user = self.request.user
        qs = InvoiceExceptionRecord.objects.all().order_by("-created_at")
        is_admin = getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )
        if is_admin:
            return qs
        if hasattr(user, "entity") and user.entity and user.entity.company:
            cid = user.entity.company.id
            return qs.filter(run__company_scope_reference=cid)
        return qs.none()

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Resolve an exception record."""
        from django.utils import timezone
        exc = self.get_object()
        if exc.resolved:
            return Response({"error": "Exception is already resolved."}, status=400)
        exc.resolved = True
        exc.resolved_at = timezone.now()
        exc.save(update_fields=["resolved", "resolved_at"])
        return Response(InvoiceExceptionRecordSerializer(exc).data)


class ReconciliationMatchResultViewSet(CheckAccessMixin, viewsets.ModelViewSet):
    """Match results for reconciliation upload jobs."""
    queryset = VendorReconciliationMatchResult.objects.all().order_by("-created_at")
    serializer_class = ReconciliationMatchResultSerializer
    action_capability_map = {
        "list": "invoicing.reconciliation.read",
        "retrieve": "invoicing.reconciliation.read",
        "create": "invoicing.reconciliation.upload",
        "update": "invoicing.reconciliation.manage",
        "partial_update": "invoicing.reconciliation.manage",
        "destroy": "invoicing.reconciliation.manage",
    }
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["upload_job", "match_result_status"]

    def get_queryset(self):
        user = self.request.user
        qs = VendorReconciliationMatchResult.objects.all().order_by("-created_at")
        is_admin = getattr(user, "is_cixci_admin", False) or (
            hasattr(user, "company") and user.company and user.company.company_type == "cixci_internal"
        )
        if is_admin:
            return qs
        if hasattr(user, "entity") and user.entity and user.entity.company:
            cid = user.entity.company.id
            return qs.filter(upload_job__vendor_company_reference=cid)
        return qs.none()


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register("runs", InvoiceRunViewSet, basename="invoice-run")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("exceptions", InvoiceExceptionRecordViewSet, basename="invoice-exception")
router.register("match-results", ReconciliationMatchResultViewSet, basename="reconciliation-match-result")

urlpatterns = [path("", include(router.urls))]
