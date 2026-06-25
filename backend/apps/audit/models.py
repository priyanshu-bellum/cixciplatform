"""
Logs & Audit — PR-A Core Evidence Spine

Architecture rules enforced here:
- AuditRecord (observation) and EvidenceRecord (artifact) are DISTINCT entities
- All records are append-only — no silent rewrites
- Corrections use EvidenceAmendmentRecord (small fix) or EvidenceSupersessionRecord (source corrected)
- retention_class, redaction_class, access_class assigned AT CREATION (never silently changed)
"""
import uuid
from django.db import models
from django.utils import timezone


# ─── Enumerations ─────────────────────────────────────────────────────────────

class RetentionClass(models.TextChoices):
    TRANSIENT = "transient", "Transient"
    STANDARD = "standard", "Standard"
    EXTENDED = "extended", "Extended"
    REGULATORY = "regulatory", "Regulatory"
    LEGAL_HOLD = "legal_hold", "Legal Hold"
    AUDIT_CRITICAL = "audit_critical", "Audit Critical"


class RedactionClass(models.TextChoices):
    PUBLIC_METADATA = "public_metadata_placeholder", "Public Metadata"
    BUYER_VISIBLE = "buyer_visible_audit", "Buyer Visible Audit"
    VENDOR_VISIBLE = "vendor_visible_audit", "Vendor Visible Audit"
    INTERNAL_OPS = "internal_operations", "Internal Operations"
    CUSTOMER_SENSITIVE = "customer_sensitive_restricted", "Customer Sensitive Restricted"
    PRICING_SENSITIVE = "pricing_sensitive_restricted", "Pricing Sensitive Restricted"
    INVOICE_SENSITIVE = "invoice_sensitive_restricted", "Invoice Sensitive Restricted"
    WARRANTY_SENSITIVE = "warranty_sensitive_restricted", "Warranty Sensitive Restricted"
    TENANT_SECURITY = "tenant_security_restricted", "Tenant Security Restricted"
    AUDIT_ONLY = "audit_only", "Audit Only"


class AccessClass(models.TextChoices):
    PUBLIC_METADATA = "public_metadata", "Public Metadata"
    BUYER_VISIBLE = "buyer_visible", "Buyer Visible"
    VENDOR_VISIBLE = "vendor_visible", "Vendor Visible"
    INTERNAL_OPS = "internal_operations", "Internal Operations"
    SYSTEM_ADMIN_ONLY = "system_admin_only", "System Admin Only"
    COMPLIANCE_ONLY = "compliance_only", "Compliance Only"


class EvidenceStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    SUPERSEDED = "superseded", "Superseded"
    AMENDED = "amended", "Amended"


# ─── AuditRecord (observation) ────────────────────────────────────────────────

class AuditRecord(models.Model):
    """
    The OBSERVATION. An audit-worthy thing happened.
    CAN exist without an EvidenceRecord (e.g. read-access events).
    Append-only — never mutated after creation.

    PR-A Rule: Audit-Record-and-Evidence-Record Separation Rule.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # What happened
    event_code = models.CharField(max_length=200, db_index=True)
    event_description = models.TextField(blank=True)
    status = models.CharField(max_length=50)

    # Who did it (mutually exclusive or both present for delegated actions)
    actor_reference = models.UUIDField(null=True, blank=True, help_text="Human user ID")
    service_trigger_reference = models.CharField(
        max_length=200, blank=True,
        help_text="Non-human service identity (scheduler, webhook handler, celery task)"
    )
    company_scope_reference = models.UUIDField(help_text="Tenant Company scope — REQUIRED")

    # What it relates to (Source Module Reference triad — REQUIRED for evidence-bearing events)
    source_module = models.CharField(max_length=100, blank=True)
    source_record_type = models.CharField(max_length=150, blank=True)
    source_record_id = models.UUIDField(null=True, blank=True)

    # Back-link to EvidenceRecord (optional — null for pure observation events)
    evidence_record_reference = models.UUIDField(null=True, blank=True)

    # Tracing
    correlation_id = models.UUIDField(null=True, blank=True, db_index=True)
    idempotency_key = models.CharField(max_length=255, blank=True, db_index=True)

    # Error / retry info
    error_code = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)

    # Governance (assigned at creation — PR-A At-Creation Classification Rule)
    retention_class = models.CharField(max_length=30, choices=RetentionClass.choices, default=RetentionClass.STANDARD)
    redaction_class = models.CharField(max_length=50, choices=RedactionClass.choices, default=RedactionClass.INTERNAL_OPS)
    access_class = models.CharField(max_length=30, choices=AccessClass.choices, default=AccessClass.INTERNAL_OPS)

    # Timestamps (append-only)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "audit_record"
        indexes = [
            models.Index(fields=["source_module", "source_record_id"]),
            models.Index(fields=["company_scope_reference", "created_at"]),
            models.Index(fields=["event_code", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        # Enforce append-only: no updates after creation
        if self.pk and AuditRecord.objects.filter(pk=self.pk).exists():
            raise ValueError("AuditRecord is append-only and cannot be modified after creation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"AuditRecord({self.event_code}, {self.created_at})"


# ─── EvidenceRecord (artifact) ────────────────────────────────────────────────

class EvidenceRecord(models.Model):
    """
    The ARTIFACT. Proof of what happened.
    ALWAYS references its parent AuditRecord.
    Append-only. Corrections use Amendment or Supersession.

    PR-A Rule: Evidence-Per-Lifecycle-Step Rule —
      create evidence even for canceled, failed, or superseded outcomes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Parent observation (required)
    audit_record = models.ForeignKey(
        AuditRecord, on_delete=models.PROTECT,
        related_name="evidence_records"
    )

    # Discriminator — what kind of evidence this is
    evidence_type = models.CharField(max_length=100, db_index=True,
        help_text="e.g. file_evidence, api_transmission_evidence, import_evidence, summary_evidence")

    evidence_status = models.CharField(
        max_length=20, choices=EvidenceStatus.choices, default=EvidenceStatus.ACTIVE
    )

    # Source references (PR-A triad)
    source_module = models.CharField(max_length=100, blank=True)
    source_record_type = models.CharField(max_length=150, blank=True)
    source_record_id = models.UUIDField(null=True, blank=True)
    source_snapshot_reference = models.UUIDField(null=True, blank=True,
        help_text="Minimized snapshot — per Source Snapshot Minimization Rule")

    # Company scope (required)
    company_scope_reference = models.UUIDField(db_index=True)

    # Actor / service
    actor_reference = models.UUIDField(null=True, blank=True)
    service_trigger_reference = models.CharField(max_length=200, blank=True)

    # Attachment reference (for file evidence)
    evidence_attachment_reference = models.UUIDField(null=True, blank=True)

    # Integrity
    evidence_hash_reference = models.CharField(max_length=512, blank=True,
        help_text="Hash of evidence payload at creation (algorithm is implementation-level)")

    # Schema version for forward compatibility
    evidence_schema_version = models.CharField(max_length=20, default="1.0")

    # Tracing
    source_event_reference = models.CharField(max_length=255, blank=True)
    correlation_reference = models.UUIDField(null=True, blank=True)
    trace_reference = models.CharField(max_length=255, blank=True)
    idempotency_key = models.CharField(max_length=255, blank=True, db_index=True)
    replay_safe_dedupe_reference = models.CharField(max_length=255, blank=True)

    # Governance (At-Creation Classification Rule)
    retention_class = models.CharField(max_length=30, choices=RetentionClass.choices, default=RetentionClass.STANDARD)
    redaction_class = models.CharField(max_length=50, choices=RedactionClass.choices, default=RedactionClass.INTERNAL_OPS)
    access_class = models.CharField(max_length=30, choices=AccessClass.choices, default=AccessClass.INTERNAL_OPS)
    restricted_evidence = models.BooleanField(default=False)

    # Redaction projections (populated by future PR-D)
    raw_evidence_reference = models.UUIDField(null=True, blank=True)
    redacted_view_reference = models.UUIDField(null=True, blank=True)
    legal_hold_reference = models.UUIDField(null=True, blank=True)

    captured_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "audit_evidence_record"
        indexes = [
            models.Index(fields=["evidence_type", "captured_at"]),
            models.Index(fields=["source_module", "source_record_id"]),
            models.Index(fields=["company_scope_reference", "captured_at"]),
            models.Index(fields=["evidence_status"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and EvidenceRecord.objects.filter(pk=self.pk).exists():
            # Only allow status transition updates (supersession workflow)
            existing = EvidenceRecord.objects.get(pk=self.pk)
            if existing.evidence_status == EvidenceStatus.ACTIVE and self.evidence_status == EvidenceStatus.SUPERSEDED:
                # Allow this specific transition
                EvidenceRecord.objects.filter(pk=self.pk).update(evidence_status=self.evidence_status)
                return
            raise ValueError("EvidenceRecord is append-only. Use Amendment or Supersession for corrections.")
        super().save(*args, **kwargs)


# ─── EvidenceAmendmentRecord (small metadata corrections) ─────────────────────

class EvidenceAmendmentRecord(models.Model):
    """
    Small correction to an existing EvidenceRecord.
    Original EvidenceRecord stays ACTIVE — amendment is metadata attached to it.

    PR-A Rule: Amendment vs Supersession Distinction Rule.
    Use Amendment when: typo, missing field, additional context, actor disambiguated.
    Use Supersession when: the underlying source-module record was corrected.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence_record = models.ForeignKey(
        EvidenceRecord, on_delete=models.PROTECT,
        related_name="amendments"
    )
    actor_reference = models.UUIDField(help_text="Who submitted this amendment")
    reason = models.TextField()
    amendment_detail = models.JSONField(help_text="What was corrected — field name, old value, new value")
    audit_record_reference = models.UUIDField(help_text="AuditRecord for this amendment action")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "audit_evidence_amendment"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("EvidenceAmendmentRecord is append-only.")
        super().save(*args, **kwargs)


# ─── EvidenceSupersessionRecord (source-record corrected) ─────────────────────

class EvidenceSupersessionRecord(models.Model):
    """
    A new EvidenceRecord supersedes a prior one because the source-module record was corrected.
    Prior transitions to SUPERSEDED. Both records remain queryable.

    PR-A Rule: Amendment vs Supersession Distinction Rule.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prior_evidence_record = models.ForeignKey(
        EvidenceRecord, on_delete=models.PROTECT,
        related_name="superseded_by"
    )
    new_evidence_record = models.ForeignKey(
        EvidenceRecord, on_delete=models.PROTECT,
        related_name="supersedes"
    )
    source_module_correction_reference = models.UUIDField(
        help_text="Reference to the source-module correction that triggered this supersession"
    )
    actor_reference = models.UUIDField()
    reason = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "audit_evidence_supersession"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("EvidenceSupersessionRecord is append-only.")
        super().save(*args, **kwargs)


# ─── FileTrackingRecord (PR-B) ─────────────────────────────────────────────────

class FileDirection(models.TextChoices):
    UPLOADED = "uploaded", "Uploaded (external → CIXCI)"
    GENERATED = "generated", "Generated (CIXCI-created)"
    DOWNLOADED = "downloaded", "Downloaded (CIXCI → external)"


class FilePurpose(models.TextChoices):
    PRODUCT_IMPORT = "product_import", "Product Import"
    PRODUCT_EXPORT = "product_export", "Product Export"
    VENDOR_ORDER_EXPORT = "vendor_order_export", "Vendor Order Export"
    VENDOR_RETURN_EXPORT = "vendor_return_export", "Vendor Return Export"
    VENDOR_SHIPPING_IMPORT = "vendor_shipping_import", "Vendor Shipping Import"
    VENDOR_DELIVERY_IMPORT = "vendor_delivery_import", "Vendor Delivery Import"
    VENDOR_RETURN_IMPORT = "vendor_return_import", "Vendor Return Import"
    MEDIA_UPLOAD = "media_upload", "Media Upload"
    INVOICE_EXPORT = "invoice_export", "Invoice Export"
    REPORT_EXPORT = "report_export", "Report Export"
    AUDIT_EXPORT = "audit_export", "Audit Export"
    UNKNOWN_OTHER = "unknown_other", "Unknown / Other"


class FileLifecycleStatus(models.TextChoices):
    RECEIVED = "received", "Received"
    GENERATED = "generated", "Generated"
    STORED = "stored", "Stored"
    QUEUED_FOR_VALIDATION = "queued_for_validation", "Queued for Validation"
    VALIDATING = "validating", "Validating"
    VALIDATION_FAILED = "validation_failed", "Validation Failed"
    VALIDATION_PASSED = "validation_passed", "Validation Passed"
    PROCESSING = "processing", "Processing"
    PROCESSING_FAILED = "processing_failed", "Processing Failed"
    PROCESSED = "processed", "Processed"
    PARTIALLY_PROCESSED = "partially_processed", "Partially Processed"
    DUPLICATE_DETECTED = "duplicate_detected", "Duplicate Detected"
    SUPERSEDED = "superseded", "Superseded"
    REPLACED = "replaced", "Replaced"
    CANCELED = "canceled", "Canceled"
    EXPIRED = "expired", "Expired"
    ARCHIVED = "archived", "Archived"


class FileTrackingRecord(models.Model):
    """
    PR-B: File Tracking Foundation.
    Records file-specific lifecycle detail.
    ALWAYS references both AuditRecord and EvidenceRecord.

    PR-B Rule: File-Tracking-Tenant-Scope Rule — tenant-scoped by default.
    PR-B Rule: Reupload-Creates-New-File-Tracking-Record Rule — append-only.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Spine integration (required)
    audit_record = models.ForeignKey(AuditRecord, on_delete=models.PROTECT, related_name="file_tracking_records")
    evidence_record = models.ForeignKey(EvidenceRecord, on_delete=models.PROTECT, related_name="file_tracking_records")

    # PR-B discriminators
    file_direction = models.CharField(max_length=20, choices=FileDirection.choices)
    file_purpose = models.CharField(max_length=50, choices=FilePurpose.choices)
    file_lifecycle_status = models.CharField(max_length=40, choices=FileLifecycleStatus.choices)

    # File identity
    file_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50)
    file_version = models.CharField(max_length=50, blank=True)

    # Storage & integrity
    file_storage_reference = models.CharField(max_length=1000, blank=True)
    file_hash_reference = models.CharField(max_length=512, blank=True)
    file_integrity_reference = models.UUIDField(null=True, blank=True)

    # Scope
    source_module = models.CharField(max_length=100)
    company_scope_reference = models.UUIDField(db_index=True)
    vendor_reference = models.UUIDField(null=True, blank=True)
    buyer_entity_scope = models.UUIDField(null=True, blank=True)

    # Actor / service
    actor_reference = models.UUIDField(null=True, blank=True)
    service_trigger_reference = models.CharField(max_length=200, blank=True)

    # Stats
    row_count = models.PositiveIntegerField(null=True, blank=True)
    accepted_row_count = models.PositiveIntegerField(null=True, blank=True)
    failed_row_count = models.PositiveIntegerField(null=True, blank=True)
    validation_status = models.CharField(max_length=50, blank=True)
    processing_status = models.CharField(max_length=50, blank=True)
    error_summary = models.TextField(blank=True)

    # Lineage
    duplicate_file_detection_reference = models.UUIDField(null=True, blank=True)
    correction_reupload_history_reference = models.UUIDField(null=True, blank=True)

    # Payload governance
    masked_payload_reference = models.UUIDField(null=True, blank=True)

    # Governance (At-Creation Classification)
    retention_class = models.CharField(max_length=30, choices=RetentionClass.choices, default=RetentionClass.STANDARD)
    redaction_class = models.CharField(max_length=50, choices=RedactionClass.choices, default=RedactionClass.INTERNAL_OPS)
    access_class = models.CharField(max_length=30, choices=AccessClass.choices, default=AccessClass.INTERNAL_OPS)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "audit_file_tracking_record"
        indexes = [
            models.Index(fields=["company_scope_reference", "file_purpose", "created_at"]),
            models.Index(fields=["source_module", "file_lifecycle_status"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("FileTrackingRecord is append-only. Use a new record for reuploads.")
        super().save(*args, **kwargs)
