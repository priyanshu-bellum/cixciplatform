"""
Fulfillment & Returns — Models (PR #92 SLA + PR-B Delivery Date)

Architecture rules (spec.md):
- Fulfillment/Returns owns OPERATIONAL decision-making only.
- SLA evaluation starts from confirmed VendorExportDeliveryEvidence (read-only from Order Routing).
- SLAEvaluationRecord is IMMUTABLE after creation. PR-B delivery date content validity
  is an INDEPENDENT surface — SLA outcome is never retroactively changed by PR-B.
- Missing/Late exception distinction: if a Missing import subsequently arrives,
  close Missing and create a new Late — NEVER mutate Missing into Late.
- SLAOverrideExcuseEvidence is immutable. Reversal requires a NEW reversing record.
- BuyerUpdateReadySignal: Phase 1 default = all-vendors aggregation.
"""
import uuid
from django.db import models
from django.utils import timezone


# ─── Enumerations ─────────────────────────────────────────────────────────────

class SLAPolicyStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUPERSEDED = "superseded", "Superseded"
    RETIRED = "retired", "Retired"


class SLAOutcome(models.TextChoices):
    ON_TIME = "on_time", "On Time"
    LATE = "late", "Late"
    MISSING = "missing", "Missing"
    PARTIAL = "partial", "Partial"
    PENDING = "pending", "Pending (evaluation in progress)"
    OVERRIDDEN = "overridden", "Overridden / Excused"


class ExceptionStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    OVERRIDDEN = "overridden", "Overridden / Excused"
    CLOSED = "closed", "Closed"


class BuyerUpdateKind(models.TextChoices):
    SHIPMENT = "shipment", "Shipment Update"
    DELIVERY = "delivery", "Delivery Update"
    CORRECTION = "correction", "Delivery Date Correction"


class BuyerSignalStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    HELD = "held", "Held (awaiting all vendors)"
    ELIGIBLE = "eligible", "Eligible"
    DISPATCHED = "dispatched", "Dispatched"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    FAILED = "failed", "Failed"


class DeliveryDateValidationOutcome(models.TextChoices):
    VALID = "valid", "Valid"
    INVALID = "invalid", "Invalid"
    REVIEW_REQUIRED = "review_required", "Review Required"
    PENDING = "pending", "Pending Validation"


# ─── Baseline: Fulfillment Handoff ────────────────────────────────────────────

class FulfillmentHandoff(models.Model):
    """
    Fulfillment operational record created when Order Routing hands off a suborder.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    routed_suborder_reference = models.UUIDField(db_index=True, unique=True)
    vendor_company_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=50, default="received",
        help_text="received | processing | shipped | delivered | exception | closed")
    delivery_evidence_reference = models.UUIDField(
        null=True, blank=True,
        help_text="VendorExportDeliveryEvidence ID (read-only reference from Order Routing)"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "fulfillment_handoff"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]


# ─── PR #92: Vendor SLA Policy ────────────────────────────────────────────────

class VendorFulfillmentResponseSLAPolicy(models.Model):
    """
    Per-vendor SLA policy. Defines response windows for SLA evaluation.
    Lifecycle: draft → active → superseded → retired.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=20, choices=SLAPolicyStatus.choices, default=SLAPolicyStatus.DRAFT)
    response_window_hours = models.PositiveIntegerField(help_text="Hours from confirmed delivery to expected fulfillment import")
    partial_threshold_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text="Percent of ordered items required to be non-partial"
    )
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    superseded_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="supersedes"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_sla_policy"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]


class SLAEvaluationRecord(models.Model):
    """
    PR #92: Created per-suborder-per-response when confirmed VendorExportDeliveryEvidence
    is consumed (READ-ONLY) from Order Routing.

    IMMUTABLE after creation.
    PR-B delivery date content validity does NOT retroactively change this outcome.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handoff = models.ForeignKey(FulfillmentHandoff, on_delete=models.PROTECT, related_name="sla_evaluations")
    sla_policy = models.ForeignKey(VendorFulfillmentResponseSLAPolicy, on_delete=models.PROTECT)

    # Order Routing reference (read-only — NEVER mutate Order Routing records)
    delivery_evidence_reference = models.UUIDField(help_text="VendorExportDeliveryEvidence ID")
    delivery_confirmed_at = models.UUIDField(null=True, blank=True,
        help_text="Snapshot of confirmed_at from delivery evidence at evaluation time")

    # SLA window
    expected_response_by = models.DateTimeField()
    # PR-B field: transport receipt time (NOT post-validation acceptance time)
    fulfillment_import_received_timestamp = models.DateTimeField(null=True, blank=True,
        help_text="PR #92: Transport receipt timestamp. NOT post-validation acceptance.")

    outcome = models.CharField(max_length=20, choices=SLAOutcome.choices, default=SLAOutcome.PENDING)
    evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_sla_evaluation"

    def save(self, *args, **kwargs):
        if self.pk and SLAEvaluationRecord.objects.filter(pk=self.pk).exists():
            raise ValueError(
                "SLAEvaluationRecord is immutable after creation. "
                "PR-B delivery date content validity does NOT retroactively change SLA outcome."
            )
        super().save(*args, **kwargs)


# ─── PR #92: SLA Exception Records ───────────────────────────────────────────

class LateFulfillmentImportException(models.Model):
    """Import arrived, but after the SLA window. Status: open → acknowledged → overridden | closed."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sla_evaluation = models.ForeignKey(SLAEvaluationRecord, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=ExceptionStatus.choices, default=ExceptionStatus.OPEN)
    actual_import_received_at = models.DateTimeField()
    delay_hours = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_late_import_exception"


class MissingFulfillmentImportException(models.Model):
    """
    No import received within SLA window.

    ARCHITECTURE RULE: If a late import subsequently arrives:
    - Close THIS record (status → closed, arrival_reference set)
    - Create a NEW LateFulfillmentImportException
    - NEVER mutate Missing into Late
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sla_evaluation = models.ForeignKey(SLAEvaluationRecord, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=ExceptionStatus.choices, default=ExceptionStatus.OPEN)
    # Set when a late arrival closes this record
    late_arrival_reference = models.UUIDField(null=True, blank=True,
        help_text="LateFulfillmentImportException ID created when import arrives. Never mutate Missing into Late.")
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_missing_import_exception"


class PartialFulfillmentResponseException(models.Model):
    """Import arrived but below partial threshold."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sla_evaluation = models.ForeignKey(SLAEvaluationRecord, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=ExceptionStatus.choices, default=ExceptionStatus.OPEN)
    expected_line_count = models.PositiveIntegerField()
    received_line_count = models.PositiveIntegerField()
    missing_line_references = models.JSONField(default=list)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_partial_response_exception"


class SLAOverrideExcuseEvidence(models.Model):
    """
    Immutable override/excuse for an SLA exception.
    Reversal requires a NEW reversing record — never mutate this record.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sla_evaluation = models.ForeignKey(SLAEvaluationRecord, on_delete=models.PROTECT)
    exception_type = models.CharField(max_length=50,
        help_text="late | missing | partial")
    exception_reference = models.UUIDField()
    override_reason = models.TextField()
    override_category = models.CharField(max_length=100,
        help_text="e.g. weather_event, system_outage, mutual_agreement, admin_error")
    actor_reference = models.UUIDField()
    audit_record_reference = models.UUIDField(null=True, blank=True)
    # Reversal chain (if this override is itself reversed by a new record)
    reversal_reference = models.UUIDField(null=True, blank=True)
    is_reversal = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_sla_override_evidence"

    def save(self, *args, **kwargs):
        if self.pk and SLAOverrideExcuseEvidence.objects.filter(pk=self.pk).exists():
            raise ValueError("SLAOverrideExcuseEvidence is immutable. Create a new reversing record.")
        super().save(*args, **kwargs)


# ─── PR-B: Delivery Date & Buyer Update Hardening ────────────────────────────

class DeliveryDateEvidence(models.Model):
    """
    PR-B: Per-shipment-line. Authoritative record of vendor-reported delivery date
    and validation outcome. Independent of SLA evaluation (PR #92).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handoff = models.ForeignKey(FulfillmentHandoff, on_delete=models.PROTECT, related_name="delivery_date_evidence")
    shipment_line_reference = models.UUIDField(db_index=True)
    vendor_reported_delivery_date = models.DateField()
    validation_outcome = models.CharField(
        max_length=20, choices=DeliveryDateValidationOutcome.choices, default=DeliveryDateValidationOutcome.PENDING
    )
    validation_detail = models.JSONField(default=dict)
    triggers_delivered_state = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_delivery_date_evidence"
        indexes = [models.Index(fields=["shipment_line_reference"])]


class DeliveryDateCorrectionEvidence(models.Model):
    """
    Immutable post-Delivered correction to a delivery date.
    Authority-gated. Never silently rewrites DeliveryDateEvidence.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_delivery_date_evidence = models.ForeignKey(
        DeliveryDateEvidence, on_delete=models.PROTECT, related_name="corrections"
    )
    corrected_delivery_date = models.DateField()
    correction_reason = models.TextField()
    authority_reference = models.UUIDField(help_text="Actor with correction authority")
    audit_record_reference = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_delivery_date_correction"

    def save(self, *args, **kwargs):
        if self.pk and DeliveryDateCorrectionEvidence.objects.filter(pk=self.pk).exists():
            raise ValueError("DeliveryDateCorrectionEvidence is immutable.")
        super().save(*args, **kwargs)


class BuyerUpdateReadySignal(models.Model):
    """
    PR-B: Lifecycle: pending → held → eligible → dispatched → acknowledged → failed.

    Phase 1 default: ALL-VENDORS aggregation — buyer updates are held until all
    vendor suborders for the parent order reach the corresponding state.
    buyer_integration_profile_reference anticipates per-buyer configurability (future).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_reference = models.UUIDField(db_index=True)
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    update_kind = models.CharField(max_length=20, choices=BuyerUpdateKind.choices)
    status = models.CharField(max_length=20, choices=BuyerSignalStatus.choices, default=BuyerSignalStatus.PENDING)

    # All-vendor aggregation state
    expected_vendor_count = models.PositiveSmallIntegerField(default=1)
    confirmed_vendor_count = models.PositiveSmallIntegerField(default=0)
    all_vendors_confirmed = models.BooleanField(default=False)

    # Future: per-buyer aggregation config
    buyer_integration_profile_reference = models.UUIDField(null=True, blank=True)

    # Dispatch tracking
    dispatched_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fulfillment_buyer_update_signal"
        indexes = [
            models.Index(fields=["order_reference", "update_kind", "status"]),
            models.Index(fields=["buyer_reference", "status"]),
        ]
