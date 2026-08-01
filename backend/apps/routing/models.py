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
from django.core.exceptions import ValidationError


class RoutingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    ROUTED = "routed", "Routed"
    PARTIALLY_ROUTED = "partially_routed", "Partially Routed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    PLACED = "placed", "Placed"
    PROCESSING = "processing", "Processing"
    SHIPMENT_PENDING = "shipment_pending", "Shipment Pending"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"


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


class VendorOrderExportLog(models.Model):
    """
    Export log / audit evidence of vendor order CSV email/export events.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True)
    buyer_company_reference = models.UUIDField(db_index=True)
    window = models.ForeignKey(VendorExportWindow, on_delete=models.PROTECT, related_name="export_logs")
    filename = models.CharField(max_length=500)
    sent_at = models.DateTimeField(default=timezone.now)
    order_count = models.PositiveIntegerField()
    suborder_count = models.PositiveIntegerField()
    sending_method = models.CharField(max_length=50, default="email")
    recipients = models.JSONField(default=list, blank=True)
    trigger_type = models.CharField(max_length=20, help_text="system | user")
    triggered_by = models.ForeignKey("tenant.User", null=True, blank=True, on_delete=models.SET_NULL)
    status_before = models.CharField(max_length=30, default="placed")
    status_after = models.CharField(max_length=30, default="processing")
    csv_backup = models.TextField(help_text="Backup copy of the raw generated CSV content")
    email_send_result = models.TextField(default="pending", help_text="Result of email delivery")
    is_reexport = models.BooleanField(default=False)
    original_log = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="reexports")
    audit_reference = models.UUIDField(default=uuid.uuid4, editable=False)
    reexport_count = models.PositiveIntegerField(default=0)
    last_reexport_status = models.CharField(max_length=30, blank=True, null=True)
    last_reexported_at = models.DateTimeField(blank=True, null=True)
    last_reexported_by_name = models.CharField(max_length=255, blank=True, null=True)

    # Detailed Audit & Snapshot Fields
    triggered_by_user_name_snapshot = models.CharField(max_length=255, blank=True, null=True)
    triggered_by_company_name_snapshot = models.CharField(max_length=255, blank=True, null=True)
    triggered_by_role_snapshot = models.CharField(max_length=255, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    correlation_id = models.UUIDField(default=uuid.uuid4, editable=False)

    # System/Automated Trigger Fields
    system_process_name = models.CharField(max_length=255, blank=True, null=True)
    system_process_id = models.CharField(max_length=255, blank=True, null=True)
    system_job_id = models.CharField(max_length=255, blank=True, null=True)
    system_schedule_desc = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "routing_vendor_order_export_log"
        indexes = [
            models.Index(fields=["vendor_company_reference", "buyer_company_reference"]),
            models.Index(fields=["sent_at"]),
        ]

    def clean(self):
        super().clean()
        if self.trigger_type:
            self.trigger_type = self.trigger_type.upper()
        
        if self.trigger_type == "USER":
            if not self.triggered_by_id:
                raise ValidationError({"triggered_by": "triggered_by is required when trigger_type is USER"})
            if not self.triggered_by_user_name_snapshot:
                raise ValidationError({"triggered_by_user_name_snapshot": "triggered_by_user_name_snapshot is required when trigger_type is USER"})
            if not self.triggered_by_role_snapshot:
                raise ValidationError({"triggered_by_role_snapshot": "triggered_by_role_snapshot is required when trigger_type is USER"})
            
            if self.system_process_name or self.system_process_id or self.system_job_id or self.system_schedule_desc:
                raise ValidationError("System process fields must be blank when trigger_type is USER")
                
        elif self.trigger_type == "SYSTEM":
            if not self.system_process_name:
                raise ValidationError({"system_process_name": "system_process_name is required when trigger_type is SYSTEM"})
            if not self.system_process_id:
                raise ValidationError({"system_process_id": "system_process_id is required when trigger_type is SYSTEM"})
                
            if self.triggered_by_id or self.triggered_by_user_name_snapshot or self.triggered_by_company_name_snapshot or self.triggered_by_role_snapshot:
                raise ValidationError("User actor fields must be blank when trigger_type is SYSTEM")
        else:
            raise ValidationError({"trigger_type": "trigger_type must be USER or SYSTEM"})

    def save(self, *args, **kwargs):
        if self.trigger_type:
            self.trigger_type = self.trigger_type.upper()
        self.full_clean()
        if self._state.adding:
            super().save(*args, **kwargs)
        else:
            # Enforce immutability on key fields
            original = VendorOrderExportLog.objects.get(pk=self.pk)
            if original.csv_backup != self.csv_backup:
                raise ValueError("csv_backup is immutable")
            if original.filename != self.filename:
                raise ValueError("filename is immutable")
            if original.vendor_company_reference != self.vendor_company_reference:
                raise ValueError("vendor_company_reference is immutable")
            if original.buyer_company_reference != self.buyer_company_reference:
                raise ValueError("buyer_company_reference is immutable")
            if original.trigger_type != self.trigger_type:
                raise ValueError("trigger_type is immutable")
            if original.triggered_by_id != self.triggered_by_id:
                raise ValueError("triggered_by is immutable")
            if original.triggered_by_user_name_snapshot != self.triggered_by_user_name_snapshot:
                raise ValueError("triggered_by_user_name_snapshot is immutable")
            if original.triggered_by_role_snapshot != self.triggered_by_role_snapshot:
                raise ValueError("triggered_by_role_snapshot is immutable")
            if original.triggered_by_company_name_snapshot != self.triggered_by_company_name_snapshot:
                raise ValueError("triggered_by_company_name_snapshot is immutable")
            if original.system_process_name != self.system_process_name:
                raise ValueError("system_process_name is immutable")
            if original.system_process_id != self.system_process_id:
                raise ValueError("system_process_id is immutable")
            if original.system_job_id != self.system_job_id:
                raise ValueError("system_job_id is immutable")
            if original.system_schedule_desc != self.system_schedule_desc:
                raise ValueError("system_schedule_desc is immutable")
            if original.correlation_id != self.correlation_id:
                raise ValueError("correlation_id is immutable")
            super().save(*args, **kwargs)


class VendorOrderReexportAttempt(models.Model):
    """
    Attempt record of a vendor CSV re-export event.
    Creates a new child audit record linked to the original export batch.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reexport_attempt_id = models.CharField(max_length=50, blank=True)
    original_export_batch = models.ForeignKey(
        VendorOrderExportLog,
        on_delete=models.CASCADE,
        related_name="reexport_attempts",
        db_column="original_export_batch_id"
    )
    attempt_number = models.PositiveIntegerField()
    trigger_type = models.CharField(max_length=20, default="USER") # USER or SYSTEM

    action_type = models.CharField(
        max_length=50,
        default="REEXPORT",
        choices=[
            ("ORIGINAL_EXPORT", "ORIGINAL_EXPORT"),
            ("REEXPORT", "REEXPORT"),
            ("AUTOMATIC_RETRY", "AUTOMATIC_RETRY"),
            ("MANUAL_RETRY", "MANUAL_RETRY"),
            ("DOWNLOAD", "DOWNLOAD")
        ]
    )

    parent_attempt = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_attempts",
        db_column="parent_attempt_id"
    )

    # Actor fields for USER
    actor_user = models.ForeignKey(
        "tenant.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="actor_user_id"
    )
    actor_user_name_snapshot = models.CharField(max_length=255, blank=True, null=True)
    actor_company = models.ForeignKey(
        "tenant.Company",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="actor_company_id"
    )
    actor_company_name_snapshot = models.CharField(max_length=255, blank=True, null=True)
    actor_role_snapshot = models.CharField(max_length=255, blank=True, null=True)

    # Actor fields for SYSTEM
    actor_process_code = models.CharField(max_length=255, blank=True, null=True)
    actor_process_name = models.CharField(max_length=255, blank=True, null=True)

    reason_code = models.CharField(max_length=255, blank=True, null=True)
    reason_notes = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(default=timezone.now)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    delivery_method = models.CharField(max_length=50, default="email")
    delivery_destination_snapshot = models.TextField(blank=True)
    file_storage_reference = models.CharField(max_length=500, blank=True)
    file_checksum = models.CharField(max_length=255, blank=True)
    
    result_status = models.CharField(max_length=30, default="QUEUED")  # QUEUED, PROCESSING, SENT, FAILED, DELIVERY_FAILED
    provider_message_id = models.CharField(max_length=255, blank=True, null=True)
    error_code = models.CharField(max_length=100, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    correlation_id = models.UUIDField(default=uuid.uuid4, editable=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)

    # Automated Trigger Fields for Re-exports
    system_job_id = models.CharField(max_length=255, blank=True, null=True)
    system_schedule_desc = models.CharField(max_length=255, blank=True, null=True)

    # Backward compatibility properties
    @property
    def triggered_by_user(self):
        return self.actor_user

    @triggered_by_user.setter
    def triggered_by_user(self, value):
        self.actor_user = value

    @property
    def triggered_by_user_name_snapshot(self):
        return self.actor_user_name_snapshot

    @triggered_by_user_name_snapshot.setter
    def triggered_by_user_name_snapshot(self, value):
        self.actor_user_name_snapshot = value

    @property
    def triggered_by_company(self):
        return self.actor_company

    @triggered_by_company.setter
    def triggered_by_company(self, value):
        self.actor_company = value

    @property
    def triggered_by_company_name_snapshot(self):
        return self.actor_company_name_snapshot

    @triggered_by_company_name_snapshot.setter
    def triggered_by_company_name_snapshot(self, value):
        self.actor_company_name_snapshot = value

    @property
    def triggered_by_role_snapshot(self):
        return self.actor_role_snapshot

    @triggered_by_role_snapshot.setter
    def triggered_by_role_snapshot(self, value):
        self.actor_role_snapshot = value

    @property
    def system_process_id(self):
        return self.actor_process_code

    @system_process_id.setter
    def system_process_id(self, value):
        self.actor_process_code = value

    @property
    def system_process_name(self):
        return self.actor_process_name

    @system_process_name.setter
    def system_process_name(self, value):
        self.actor_process_name = value

    @property
    def delivery_status(self):
        return self.result_status

    @delivery_status.setter
    def delivery_status(self, value):
        self.result_status = value

    class Meta:
        db_table = "routing_vendor_order_reexport_attempt"
        ordering = ["attempt_number"]

    def clean(self):
        super().clean()
        if self.trigger_type:
            self.trigger_type = self.trigger_type.upper()
        
        valid_actions = ["ORIGINAL_EXPORT", "REEXPORT", "AUTOMATIC_RETRY", "MANUAL_RETRY", "DOWNLOAD"]
        if self.action_type not in valid_actions:
            raise ValidationError({"action_type": f"action_type must be one of {valid_actions}"})

        if self.parent_attempt and self.parent_attempt.original_export_batch != self.original_export_batch:
            raise ValidationError({"parent_attempt": "parent_attempt must belong to the same original_export_batch"})

        if self.trigger_type == "USER":
            if not self.actor_user_id:
                raise ValidationError({"actor_user": "actor_user is required when trigger_type is USER"})
            if not self.actor_user_name_snapshot:
                raise ValidationError({"actor_user_name_snapshot": "actor_user_name_snapshot is required when trigger_type is USER"})
            if not self.actor_role_snapshot:
                raise ValidationError({"actor_role_snapshot": "actor_role_snapshot is required when trigger_type is USER"})
            
            if self.actor_process_code or self.actor_process_name or self.system_job_id or self.system_schedule_desc:
                raise ValidationError("System process fields must be blank when trigger_type is USER")
                
        elif self.trigger_type == "SYSTEM":
            if not self.actor_process_code:
                raise ValidationError({"actor_process_code": "actor_process_code is required when trigger_type is SYSTEM"})
            if not self.actor_process_name:
                raise ValidationError({"actor_process_name": "actor_process_name is required when trigger_type is SYSTEM"})
                
            if self.actor_user_id or self.actor_user_name_snapshot or self.actor_company_id or self.actor_company_name_snapshot or self.actor_role_snapshot:
                raise ValidationError("User actor fields must be blank when trigger_type is SYSTEM")
        else:
            raise ValidationError({"trigger_type": "trigger_type must be USER or SYSTEM"})

    def save(self, *args, **kwargs):
        # Sync delivery_status and result_status
        if self.result_status:
            self.delivery_status = self.result_status
        elif self.delivery_status:
            self.result_status = self.delivery_status

        if self.trigger_type:
            self.trigger_type = self.trigger_type.upper()

        if self._state.adding and not self.reexport_attempt_id:
            # Generate sequential reexport_attempt_id
            if not self.attempt_number:
                existing_count = VendorOrderReexportAttempt.objects.filter(original_export_batch=self.original_export_batch).count()
                self.attempt_number = existing_count + 1
            self.reexport_attempt_id = f"rx_{self.attempt_number:05d}"

        self.full_clean()

        if self._state.adding:
            super().save(*args, **kwargs)
        else:
            # Enforce immutability on key fields
            original = VendorOrderReexportAttempt.objects.get(pk=self.pk)
            if original.original_export_batch_id != self.original_export_batch_id:
                raise ValueError("original_export_batch is immutable")
            if original.attempt_number != self.attempt_number:
                raise ValueError("attempt_number is immutable")
            if original.trigger_type != self.trigger_type:
                raise ValueError("trigger_type is immutable")
            if original.action_type != self.action_type:
                raise ValueError("action_type is immutable")
            if original.parent_attempt_id != self.parent_attempt_id:
                raise ValueError("parent_attempt is immutable")
            if original.actor_user_id != self.actor_user_id:
                raise ValueError("actor_user is immutable")
            if original.actor_user_name_snapshot != self.actor_user_name_snapshot:
                raise ValueError("actor_user_name_snapshot is immutable")
            if original.actor_company_id != self.actor_company_id:
                raise ValueError("actor_company is immutable")
            if original.actor_company_name_snapshot != self.actor_company_name_snapshot:
                raise ValueError("actor_company_name_snapshot is immutable")
            if original.actor_role_snapshot != self.actor_role_snapshot:
                raise ValueError("actor_role_snapshot is immutable")
            if original.actor_process_code != self.actor_process_code:
                raise ValueError("actor_process_code is immutable")
            if original.actor_process_name != self.actor_process_name:
                raise ValueError("actor_process_name is immutable")
            if original.system_job_id != self.system_job_id:
                raise ValueError("system_job_id is immutable")
            if original.system_schedule_desc != self.system_schedule_desc:
                raise ValueError("system_schedule_desc is immutable")
            if original.requested_at != self.requested_at:
                raise ValueError("requested_at is immutable")
            if original.delivery_method != self.delivery_method:
                raise ValueError("delivery_method is immutable")
            if original.delivery_destination_snapshot != self.delivery_destination_snapshot:
                raise ValueError("delivery_destination_snapshot is immutable")
            if original.file_storage_reference != self.file_storage_reference:
                raise ValueError("file_storage_reference is immutable")
            if original.file_checksum != self.file_checksum:
                raise ValueError("file_checksum is immutable")
            if original.correlation_id != self.correlation_id:
                raise ValueError("correlation_id is immutable")
            if original.ip_address != self.ip_address:
                raise ValueError("ip_address is immutable")
            if original.user_agent != self.user_agent:
                raise ValueError("user_agent is immutable")
            super().save(*args, **kwargs)
