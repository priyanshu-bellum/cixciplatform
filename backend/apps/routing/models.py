"""
Order Routing — Models (including PR #91 Vendor Export Governance)

Architecture rules (spec.md):
- Order Routing owns TRANSPORT governance; Fulfillment owns OPERATIONAL decision-making.
- VendorExportDeliveryEvidence.confirmed means delivery was confirmed for the
  configured delivery method ONLY. It does NOT mean vendor acknowledged, opened,
  processed, or accepted operational responsibility.
- Fulfillment/Returns MUST NOT treat confirmed delivery evidence as vendor acceptance.
- Non-collapsible state chain:
    RoutedSuborder → VendorExportBatchItem → VendorExportWindow
    → VendorExportDeliveryEvidence (confirmed; read-only by Fulfillment)
"""
import uuid
from django.db import models
from django.utils import timezone


class RoutingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    ROUTED = "routed", "Routed"
    PARTIALLY_ROUTED = "partially_routed", "Partially Routed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ExportScheduleStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUPERSEDED = "superseded", "Superseded"
    RETIRED = "retired", "Retired"


class DeliveryEvidenceStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ATTEMPTED = "attempted", "Attempted"
    CONFIRMED = "confirmed", "Confirmed"   # DELIVERY confirmed — NOT vendor acceptance
    FAILED = "failed", "Failed"
    SUPERSEDED = "superseded", "Superseded"


class ExportWindowStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    OPEN = "open", "Open"
    PROCESSING = "processing", "Processing"
    CLOSED = "closed", "Closed"
    CANCELLED = "cancelled", "Cancelled"


# ─── Order & Routed Suborder ──────────────────────────────────────────────────

class Order(models.Model):
    """Parent order record. Order Routing decomposes into routed suborders by vendor."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=30, choices=RoutingStatus.choices, default=RoutingStatus.PENDING)

    # Pricing reference (snapshot ID from Pricing — never recalculate here)
    pricing_snapshot_references = models.JSONField(default=dict,
        help_text="product_id → EffectivePriceSnapshot ID mapping")

    placed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "routing_order"
        indexes = [
            models.Index(fields=["company_scope_reference", "status"]),
            models.Index(fields=["buyer_reference", "placed_at"]),
        ]


class RoutedSuborder(models.Model):
    """
    A vendor-specific slice of an Order.
    First entity in the non-collapsible export state chain.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="routed_suborders")
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=30, choices=RoutingStatus.choices, default=RoutingStatus.PENDING)
    routing_snapshot = models.JSONField(default=dict, help_text="Routing decision snapshot at creation")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "routing_routed_suborder"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]


# ─── PR #91: Vendor Export Governance ────────────────────────────────────────

class VendorExportSchedule(models.Model):
    """
    Per-vendor or per-vendor-per-route schedule configuration.
    Lifecycle: draft → active → superseded → retired.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=20, choices=ExportScheduleStatus.choices, default=ExportScheduleStatus.DRAFT)

    delivery_method = models.CharField(max_length=50,
        help_text="api | sftp | email | webhook | manual")
    schedule_cron = models.CharField(max_length=100, blank=True,
        help_text="Cron expression for automated windows. Blank = manual only.")
    window_duration_minutes = models.PositiveIntegerField(default=60)
    schedule_timezone = models.CharField(max_length=50, default="UTC")

    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    superseded_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="supersedes"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "routing_vendor_export_schedule"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]


class VendorExportWindow(models.Model):
    """
    Time-bound instance of a VendorExportSchedule.
    Routed suborders are batched into items within an open window.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(VendorExportSchedule, on_delete=models.PROTECT, related_name="windows")
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=20, choices=ExportWindowStatus.choices, default=ExportWindowStatus.SCHEDULED)
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    item_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "routing_vendor_export_window"
        indexes = [models.Index(fields=["vendor_company_reference", "status", "opens_at"])]


class VendorExportBatchItem(models.Model):
    """
    Links a RoutedSuborder into a VendorExportWindow.
    Part of the non-collapsible state chain.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    window = models.ForeignKey(VendorExportWindow, on_delete=models.PROTECT, related_name="batch_items")
    routed_suborder = models.ForeignKey(RoutedSuborder, on_delete=models.PROTECT, related_name="batch_items")
    included_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "routing_vendor_export_batch_item"
        unique_together = [("window", "routed_suborder")]


class VendorExportDeliveryAttempt(models.Model):
    """Individual delivery attempt for a VendorExportWindow."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    window = models.ForeignKey(VendorExportWindow, on_delete=models.PROTECT, related_name="delivery_attempts")
    attempt_number = models.PositiveSmallIntegerField(default=1)
    delivery_method = models.CharField(max_length=50)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(max_length=30,
        help_text="in_progress | succeeded | failed | timed_out")
    error_detail = models.TextField(blank=True)
    provider_reference = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "routing_vendor_export_delivery_attempt"


class VendorExportDeliveryEvidence(models.Model):
    """
    Authoritative record of export delivery outcome for a VendorExportWindow.

    *** CRITICAL ARCHITECTURE RULE (verbatim from spec.md) ***
    'confirmed' means delivery was confirmed for the configured delivery method.
    It does NOT mean the vendor acknowledged, opened, processed, or accepted
    operational responsibility. Fulfillment/Returns MUST NOT treat this as
    vendor acceptance. Fulfillment/Returns owns operational decision-making;
    Order Routing owns transport evidence only.

    This record is consumed READ-ONLY by Fulfillment/Returns for SLA evaluation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    window = models.OneToOneField(
        VendorExportWindow, on_delete=models.PROTECT, related_name="delivery_evidence"
    )
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(
        max_length=20, choices=DeliveryEvidenceStatus.choices, default=DeliveryEvidenceStatus.PENDING
    )
    delivery_method = models.CharField(max_length=50)
    last_attempt = models.ForeignKey(
        VendorExportDeliveryAttempt, null=True, blank=True, on_delete=models.PROTECT
    )
    # Timestamps
    confirmed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "routing_vendor_export_delivery_evidence"
        indexes = [models.Index(fields=["vendor_company_reference", "status"])]
