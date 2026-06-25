"""
Invoice Management — Models

Architecture rules (spec.md — locked counts):
- EXACTLY 9 primary entities (enforced in this file)
- 14 invoice statuses, 15 run statuses, 10 reconciliation upload statuses, 13 match result statuses
- InvoiceLine is IMMUTABLE after creation — corrections use InvoiceAdjustment in a later period
- Invoice Management creates the QuickBooks handoff REQUEST only —
  Integration Management owns transport and records outcome
- Core vendor file rule: "The vendor reconciliation upload file is comparison evidence,
  not source truth by default"
- Core no-auto-payment rule: "CIXCI does not automatically submit vendor payment by default"
"""
import uuid
from django.db import models
from django.utils import timezone


# ─── Run Statuses (15) ────────────────────────────────────────────────────────

class InvoiceRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled", "Scheduled"
    QUEUED = "queued", "Queued"
    INITIALIZING = "initializing", "Initializing"
    RUNNING = "running", "Running"
    PAUSED = "paused", "Paused"
    VALIDATION_FAILED = "validation_failed", "Validation Failed"
    PARTIALLY_COMPLETE = "partially_complete", "Partially Complete"
    COMPLETE = "complete", "Complete"
    SUPERSEDED = "superseded", "Superseded"
    CANCELLED = "cancelled", "Cancelled"
    FAILED = "failed", "Failed"
    ROLLED_BACK = "rolled_back", "Rolled Back"
    PENDING_REVIEW = "pending_review", "Pending Review"
    ARCHIVED = "archived", "Archived"
    # 15 total ✓


# ─── Invoice Statuses (14) ────────────────────────────────────────────────────

class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_VALIDATION = "pending_validation", "Pending Validation"
    VALIDATION_FAILED = "validation_failed", "Validation Failed"
    READY = "ready", "Ready"
    ISSUED = "issued", "Issued"
    SENT = "sent", "Sent"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    DISPUTED = "disputed", "Disputed"
    PARTIALLY_PAID = "partially_paid", "Partially Paid"
    PAID = "paid", "Paid"
    OVERDUE = "overdue", "Overdue"
    VOID = "void", "Void"
    SUPERSEDED = "superseded", "Superseded"
    ARCHIVED = "archived", "Archived"
    # 14 total ✓


class InvoiceType(models.TextChoices):
    BUYER_INVOICE = "buyer_invoice", "Buyer Invoice"
    VENDOR_STATEMENT = "vendor_statement", "Vendor Statement"
    VENDOR_PAYABLE_PACKAGE = "vendor_payable_package", "Vendor Payable Package"
    COMMISSION_REPORT = "commission_report", "Commission Report"
    ADJUSTMENT_REPORT = "adjustment_report", "Adjustment Report"
    INTERNAL_ADMIN_INVOICE_REPORT = "internal_admin_invoice_report", "Internal Admin Invoice Report"


# ─── Reconciliation Upload Statuses (10) ─────────────────────────────────────

class ReconciliationUploadStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    UPLOADING = "uploading", "Uploading"
    RECEIVED = "received", "Received"
    PARSING = "parsing", "Parsing"
    PARSE_FAILED = "parse_failed", "Parse Failed"
    VALIDATING = "validating", "Validating"
    VALIDATION_FAILED = "validation_failed", "Validation Failed"
    MATCHING = "matching", "Matching"
    COMPLETE = "complete", "Complete"
    FAILED = "failed", "Failed"
    # 10 total ✓


# ─── Match Result Statuses (13) ───────────────────────────────────────────────

class MatchResultStatus(models.TextChoices):
    MATCHED = "matched", "Matched"
    MATCHED_WITH_VARIANCE = "matched_with_variance", "Matched with Variance"
    UNMATCHED_CIXCI_ONLY = "unmatched_cixci_only", "Unmatched — CIXCI Only"
    UNMATCHED_VENDOR_ONLY = "unmatched_vendor_only", "Unmatched — Vendor Only"
    DISPUTED = "disputed", "Disputed"
    PENDING_REVIEW = "pending_review", "Pending Review"
    OVERRIDE_ACCEPTED = "override_accepted", "Override Accepted"
    OVERRIDE_REJECTED = "override_rejected", "Override Rejected"
    RESOLVED = "resolved", "Resolved"
    PARTIAL_MATCH = "partial_match", "Partial Match"
    EXCLUDED = "excluded", "Excluded"
    ESCALATED = "escalated", "Escalated"
    ARCHIVED = "archived", "Archived"
    # 13 total ✓


# ─── Entity 1: InvoiceRun ─────────────────────────────────────────────────────

class InvoiceRun(models.Model):
    """Entity 1 of 9. Orchestrates a full invoice generation cycle."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=30, choices=InvoiceRunStatus.choices, default=InvoiceRunStatus.DRAFT)
    company_scope_reference = models.UUIDField(db_index=True)
    run_label = models.CharField(max_length=200, blank=True)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_detail = models.TextField(blank=True)
    created_by = models.UUIDField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_run"


# ─── Entity 2: InvoicePeriod ──────────────────────────────────────────────────

class InvoicePeriod(models.Model):
    """Entity 2 of 9. Defines a billing window."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(InvoiceRun, on_delete=models.PROTECT, related_name="periods")
    company_scope_reference = models.UUIDField(db_index=True)
    period_start = models.DateField()
    period_end = models.DateField()
    channel = models.CharField(max_length=30, blank=True)
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_period"
        indexes = [models.Index(fields=["company_scope_reference", "period_start", "is_closed"])]


# ─── Entity 3: InvoiceReport ──────────────────────────────────────────────────

class InvoiceReport(models.Model):
    """Entity 3 of 9. Summary report generated for a run."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(InvoiceRun, on_delete=models.PROTECT, related_name="reports")
    report_type = models.CharField(max_length=50,
        help_text="summary | vendor_breakdown | buyer_breakdown | exception_log | audit_trail")
    generated_at = models.DateTimeField(default=timezone.now)
    file_reference = models.UUIDField(null=True, blank=True)
    company_scope_reference = models.UUIDField(db_index=True)

    class Meta:
        db_table = "invoice_report"


# ─── Entity 4: Invoice ────────────────────────────────────────────────────────

class Invoice(models.Model):
    """
    Entity 4 of 9.
    invoice_type discriminator covers all 6 invoice types from spec.
    Previously issued invoices MUST NOT be mutated — use Adjustment in later period.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(InvoiceRun, on_delete=models.PROTECT, related_name="invoices")
    period = models.ForeignKey(InvoicePeriod, on_delete=models.PROTECT, related_name="invoices")
    company_scope_reference = models.UUIDField(db_index=True)
    invoice_type = models.CharField(max_length=40, choices=InvoiceType.choices)
    status = models.CharField(max_length=30, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)

    # Counterparty (buyer or vendor reference)
    counterparty_role = models.CharField(max_length=20, help_text="buyer | vendor")
    counterparty_reference = models.UUIDField(db_index=True)

    # Totals (computed at generation; immutable after issuance)
    subtotal = models.DecimalField(max_digits=14, decimal_places=4)
    commission_total = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    adjustment_total = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    grand_total = models.DecimalField(max_digits=14, decimal_places=4)
    currency = models.CharField(max_length=3, default="USD")

    # QuickBooks handoff (Integration Management owns transport — this is the request only)
    quickbooks_handoff_request_reference = models.UUIDField(null=True, blank=True)
    quickbooks_payment_status_reference = models.CharField(
        max_length=100, blank=True,
        help_text="QuickBooks payment status returned — NOT CIXCI-owned payment truth"
    )
    # Core no-auto-payment rule enforced at application level — documented here
    auto_payment_submitted = models.BooleanField(
        default=False,
        help_text="ALWAYS False in Phase 1. Core no-auto-payment rule: CIXCI does not automatically submit vendor payment."
    )

    issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invoice_invoice"
        indexes = [
            models.Index(fields=["company_scope_reference", "status", "invoice_type"]),
            models.Index(fields=["counterparty_reference", "status"]),
        ]


# ─── Entity 5: InvoiceLine ────────────────────────────────────────────────────

class InvoiceLine(models.Model):
    """
    Entity 5 of 9.
    IMMUTABLE after creation. Snapshot values stored as evidence.
    Corrections use InvoiceAdjustment in a later period.
    Idempotency: (invoice_period + counterparty + source_order_line_reference)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="lines")
    # Idempotency key (spec)
    idempotency_key = models.CharField(max_length=512, db_index=True,
        help_text="hash(period_id, counterparty_reference, source_order_line_reference)")

    # Source Reference Sub-Structure (snapshot values — MUST NOT change when upstream records change)
    source_module = models.CharField(max_length=100)
    source_order_line_reference = models.UUIDField(db_index=True)
    source_product_reference = models.UUIDField(null=True, blank=True)
    source_pricing_snapshot_reference = models.UUIDField(
        help_text="EffectivePriceSnapshot ID — snapshot evidence; not a live FK"
    )
    source_fulfillment_evidence_reference = models.UUIDField(null=True, blank=True)

    # Values snapshotted at line creation (immutable)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=3, default="USD")

    line_description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_line"
        unique_together = [("invoice", "idempotency_key")]

    def save(self, *args, **kwargs):
        if self.pk and InvoiceLine.objects.filter(pk=self.pk).exists():
            raise ValueError(
                "InvoiceLine is immutable after creation. "
                "Corrections must use InvoiceAdjustment in a later period."
            )
        super().save(*args, **kwargs)


# ─── Entity 6: InvoiceAdjustment ─────────────────────────────────────────────

class InvoiceAdjustment(models.Model):
    """
    Entity 6 of 9.
    Late refunds after a closed period → a new InvoiceAdjustment in a later period.
    Never mutate the original InvoiceLine.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="adjustments")
    original_line = models.ForeignKey(InvoiceLine, null=True, blank=True, on_delete=models.PROTECT)
    adjustment_kind = models.CharField(max_length=50,
        help_text="refund | credit | debit | fee_adjustment | commission_correction | late_return_credit | write_off | other")
    amount = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=3, default="USD")
    reason = models.TextField()
    evidence_reference = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_adjustment"


# ─── Entity 7: InvoiceExceptionRecord ────────────────────────────────────────

class InvoiceExceptionRecord(models.Model):
    """Entity 7 of 9. Records exceptions encountered during invoice generation or validation."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(InvoiceRun, on_delete=models.PROTECT, related_name="exceptions")
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.PROTECT)
    exception_kind = models.CharField(max_length=80,
        help_text="e.g. missing_delivery_evidence | pricing_snapshot_expired | duplicate_line | eligibility_failed")
    description = models.TextField()
    source_reference = models.UUIDField(null=True, blank=True)
    is_blocking = models.BooleanField(default=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_exception_record"
        indexes = [models.Index(fields=["run", "is_blocking", "resolved"])]


# ─── Entity 8: VendorReconciliationUploadJob ─────────────────────────────────

class VendorReconciliationUploadJob(models.Model):
    """
    Entity 8 of 9.
    Core vendor file rule: "The vendor reconciliation upload file is comparison
    evidence, not source truth by default."
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="reconciliation_jobs")
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(
        max_length=30, choices=ReconciliationUploadStatus.choices, default=ReconciliationUploadStatus.PENDING
    )
    file_reference = models.UUIDField(null=True, blank=True)
    file_tracking_reference = models.UUIDField(null=True, blank=True)
    row_count = models.PositiveIntegerField(null=True, blank=True)
    matched_count = models.PositiveIntegerField(null=True, blank=True)
    unmatched_count = models.PositiveIntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_reconciliation_upload_job"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]


# ─── Entity 9: VendorReconciliationMatchResult ────────────────────────────────

class VendorReconciliationMatchResult(models.Model):
    """
    Entity 9 of 9.
    13 match_result_status values per spec.
    Vendor file is comparison evidence only — CIXCI-owned invoice line is authoritative.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload_job = models.ForeignKey(
        VendorReconciliationUploadJob, on_delete=models.PROTECT, related_name="match_results"
    )
    invoice_line = models.ForeignKey(InvoiceLine, null=True, blank=True, on_delete=models.PROTECT)
    match_result_status = models.CharField(max_length=30, choices=MatchResultStatus.choices)

    # CIXCI-authoritative values
    cixci_line_total = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    # Vendor-reported values (comparison evidence only)
    vendor_reported_total = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    vendor_line_reference = models.CharField(max_length=255, blank=True)

    variance_amount = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    resolved_by = models.UUIDField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoice_reconciliation_match_result"
        indexes = [models.Index(fields=["upload_job", "match_result_status"])]
