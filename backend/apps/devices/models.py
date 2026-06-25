"""
Device Catalog — Models

Architecture rules (spec.md):
- Device Catalog is the canonical authority for device identity, lifecycle,
  feature truth, and buyer portfolio source records
- Non-collapsible state chain:
    Raw CSV row → CompatibilityMarker → SuggestedNormalization
    → DeviceFeatureAssignment (first feature truth)
    → DeviceCapabilityEvidence (derived; read-only for consumers)
    → Product Catalog compatibility assertion (Product Catalog owns)
- Buyer-scope triad on ALL buyer-scoped entities (BuyerDevicePortfolioReference,
  BuyerDevicePortfolioSnapshot, BuyerDevicePortfolioChangeRecord)
- Cross-buyer reads/mutations architecturally impossible via BuyerScopedQuerysetMixin
- DeviceCapabilityEvidence is DERIVED — consuming modules (Product Catalog) read it;
  they do NOT create or mutate it directly
"""
import uuid
from django.db import models
from django.utils import timezone


# ─── Enumerations ─────────────────────────────────────────────────────────────

class DeviceLifecycleStatus(models.TextChoices):
    ANNOUNCED = "announced", "Announced"
    AVAILABLE = "available", "Available"
    CURRENT = "current", "Current"
    LEGACY = "legacy", "Legacy"
    EOL = "eol", "End of Life"
    RETIRED = "retired", "Retired"
    INACTIVE = "inactive", "Inactive"
    ARCHIVED = "archived", "Archived"


class FeatureGroupLifecycle(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    DEPRECATED = "deprecated", "Deprecated"
    RETIRED = "retired", "Retired"


class FeatureValueLifecycle(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    DEPRECATED = "deprecated", "Deprecated"
    RETIRED = "retired", "Retired"


class ProfileStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUPERSEDED = "superseded", "Superseded"
    RETIRED = "retired", "Retired"


class DQEStatus(models.TextChoices):
    CREATED = "created", "Created"
    UNDER_REVIEW = "under_review", "Under Review"
    RESOLVED = "resolved", "Resolved"
    DISMISSED = "dismissed", "Dismissed"
    UNRESOLVED = "unresolved", "Unresolved"


class PortfolioChangeType(models.TextChoices):
    DEVICE_ADDED = "device_added", "Device Added"
    DEVICE_REMOVED = "device_removed", "Device Removed"
    DEVICE_REACTIVATED = "device_reactivated", "Device Reactivated"
    DEVICE_DEACTIVATED = "device_deactivated", "Device Deactivated"
    PORTFOLIO_RESET = "portfolio_reset", "Portfolio Reset"
    ADMIN_CORRECTION = "admin_correction", "Admin Correction"
    SERVICE_SYNC = "service_sync", "Service Identity Sync"
    SYSTEM_CORRECTION = "system_correction", "System Correction"


class ChangeSource(models.TextChoices):
    BUYER_ACTION = "buyer_action", "Buyer Action"
    ADMIN_ON_BEHALF = "admin_on_behalf", "Admin On Behalf"
    SERVICE_IDENTITY_SYNC = "service_identity_sync", "Service Identity Sync"
    SYSTEM_CORRECTION = "system_correction", "System Correction"


# ─── Device Taxonomy ──────────────────────────────────────────────────────────

class DeviceType(models.Model):
    """Top-level device taxonomy (e.g. Smartphone, Tablet, Wearable)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default="setup_required")
    auto_mapping_eligible = models.BooleanField(default=True)
    supported_accessory_categories = models.JSONField(default=list, blank=True)
    compatibility_rules = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "device_type"

    def __str__(self):
        return self.name


class Manufacturer(models.Model):
    """Device manufacturer (Apple, Samsung, Google, etc.)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    company_reference = models.UUIDField(null=True, blank=True, help_text="Tenant Company reference if onboarded")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_manufacturer"

    def __str__(self):
        return self.name


# ─── Device (Canonical Record) ────────────────────────────────────────────────

class Device(models.Model):
    """
    Canonical device record. Device Catalog is the authority.
    Product Catalog and Order Routing consume read-only references — never mutate.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_type = models.ForeignKey(DeviceType, on_delete=models.PROTECT, related_name="devices")
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.PROTECT, related_name="devices")

    name = models.CharField(max_length=300)
    model_number = models.CharField(max_length=200, blank=True, db_index=True)
    sku = models.CharField(max_length=200, blank=True, db_index=True)
    lifecycle_status = models.CharField(
        max_length=20, choices=DeviceLifecycleStatus.choices, default=DeviceLifecycleStatus.AVAILABLE
    )

    # Key dates — owned by Device Catalog
    announced_date = models.DateField(null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)
    launch_date = models.DateField(null=True, blank=True)
    eol_date = models.DateField(null=True, blank=True)

    # Image readiness reference (back-ref to Media module)
    image_readiness_reference = models.UUIDField(null=True, blank=True)

    # Audit
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    imported_by = models.UUIDField(null=True, blank=True, help_text="System Admin actor reference")

    # Structured capability fields for auto-mapping
    bluetooth_compatibility = models.CharField(max_length=50, default="Yes", blank=True)
    headphone_jack_compatibility = models.CharField(max_length=50, default="Not Compatible", blank=True)
    compatible_charging_interface = models.CharField(max_length=50, default="Not Compatible", blank=True)
    wireless_charging_compatibility = models.CharField(max_length=100, default="Not Compatible", blank=True)
    storage_expansion_compatibility = models.CharField(max_length=50, default="Not Compatible", blank=True)
    maximum_supported_storage = models.CharField(max_length=50, default="Not Compatible", blank=True)
    compatible_watch_case_size = models.CharField(max_length=50, default="Not Compatible", blank=True)

    class Meta:
        db_table = "device_device"
        indexes = [
            models.Index(fields=["lifecycle_status"]),
            models.Index(fields=["manufacturer", "device_type"]),
            models.Index(fields=["model_number"]),
        ]

    def __str__(self):
        return f"{self.manufacturer.name} {self.name}"

    def save(self, *args, **kwargs):
        actor_id = kwargs.pop("actor_id", None)
        is_new = not self.pk or not Device.objects.filter(pk=self.pk).exists()
        old_status = None
        old_launch = None
        old_compat_fields = {}
        compat_fields = [
            "bluetooth_compatibility", "headphone_jack_compatibility",
            "compatible_charging_interface", "wireless_charging_compatibility",
            "storage_expansion_compatibility", "maximum_supported_storage",
            "compatible_watch_case_size"
        ]

        if not is_new:
            try:
                old_self = Device.objects.get(pk=self.pk)
                old_status = old_self.lifecycle_status
                old_launch = old_self.launch_date
                for f in compat_fields:
                    old_compat_fields[f] = getattr(old_self, f)
            except Device.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Log status change in audit log
        if not is_new and old_status != self.lifecycle_status:
            try:
                from apps.devices.services import log_device_audit
                log_device_audit(
                    event_code="devices.device.status_changed",
                    description=f"Device lifecycle status changed from '{old_status}' to '{self.lifecycle_status}'.",
                    device_id=self.id,
                    actor_id=actor_id or self.imported_by
                )
            except Exception as e:
                import logging
                logger = logging.getLogger("apps.devices")
                logger.error(f"Failed to log device status change: {e}")

        trigger_remap = is_new
        if not is_new:
            if old_status != self.lifecycle_status or old_launch != self.launch_date:
                trigger_remap = True
            else:
                for f in compat_fields:
                    if old_compat_fields[f] != getattr(self, f):
                        trigger_remap = True
                        break

        if trigger_remap:
            try:
                from apps.catalog.compatibility_engine import run_device_remapping
                run_device_remapping(self, actor_id=actor_id, change_source="System Remap" if not is_new else "Device Created")
            except Exception as e:
                import logging
                logger = logging.getLogger("apps.devices")
                logger.error(f"Failed to run device reverse remapping: {e}")


# ─── PR-A: Feature Evidence Foundation ────────────────────────────────────────

class FeatureGroup(models.Model):
    """
    Taxonomy of feature groups (e.g. Connectivity, Screen Size, OS Version).
    Lifecycle-managed: draft → active → deprecated → retired.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_type = models.ForeignKey(DeviceType, on_delete=models.PROTECT, related_name="feature_groups")
    name = models.CharField(max_length=150)
    code = models.SlugField(max_length=100)
    description = models.TextField(blank=True)
    lifecycle = models.CharField(max_length=15, choices=FeatureGroupLifecycle.choices, default=FeatureGroupLifecycle.DRAFT)
    is_required_for_compatibility = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "device_feature_group"
        unique_together = [("device_type", "code")]

    def __str__(self):
        return f"{self.device_type.code}/{self.code}"


class FeatureValue(models.Model):
    """
    A valid value within a FeatureGroup (e.g. "5G", "4G LTE", "WiFi 6").
    Lifecycle-managed per FeatureGroup.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feature_group = models.ForeignKey(FeatureGroup, on_delete=models.PROTECT, related_name="values")
    value = models.CharField(max_length=200)
    code = models.SlugField(max_length=100)
    lifecycle = models.CharField(max_length=15, choices=FeatureValueLifecycle.choices, default=FeatureValueLifecycle.DRAFT)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_feature_value"
        unique_together = [("feature_group", "code")]

    def __str__(self):
        return f"{self.feature_group.code}:{self.code}"


class ProfileRequirementLevel(models.TextChoices):
    REQUIRED = "required", "Required"
    OPTIONAL = "optional", "Optional"
    UNSUPPORTED = "unsupported", "Unsupported"
    REVIEW_REQUIRED = "review_required", "Review Required"


class DeviceCapabilityProfile(models.Model):
    """
    Per-DeviceType profile declaring which FeatureGroups are required/optional/unsupported.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_type = models.ForeignKey(DeviceType, on_delete=models.PROTECT, related_name="capability_profiles")
    feature_group = models.ForeignKey(FeatureGroup, on_delete=models.PROTECT)
    requirement_level = models.CharField(max_length=20, choices=ProfileRequirementLevel.choices)
    status = models.CharField(max_length=20, choices=ProfileStatus.choices, default=ProfileStatus.DRAFT)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "device_capability_profile"
        unique_together = [("device_type", "feature_group", "status")]


class DeviceFeatureAssignment(models.Model):
    """
    The AUTHORITATIVE feature truth for a device.
    First step in the non-collapsible state chain that leads to DeviceCapabilityEvidence.
    Only created by Device Catalog workflows — never by Product Catalog or other consumers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name="feature_assignments")
    feature_group = models.ForeignKey(FeatureGroup, on_delete=models.PROTECT)
    feature_value = models.ForeignKey(FeatureValue, on_delete=models.PROTECT)
    is_active = models.BooleanField(default=True)
    # Override tracking (5 override cases)
    is_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    override_actor_reference = models.UUIDField(null=True, blank=True)
    # Audit evidence
    audit_record_reference = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_feature_assignment"
        indexes = [
            models.Index(fields=["device", "feature_group", "is_active"]),
        ]

    def __str__(self):
        return f"{self.device} | {self.feature_group.code}={self.feature_value.code}"


class DeviceCapabilityEvidence(models.Model):
    """
    DERIVED read model. Computed from DeviceFeatureAssignments.
    Consuming modules (Product Catalog) read this — they do NOT create or mutate it.
    Regeneration via Device Catalog Workflow 5 only.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.OneToOneField(Device, on_delete=models.PROTECT, related_name="capability_evidence")
    # Snapshot of current feature assignments
    feature_snapshot = models.JSONField(
        help_text="Dict of {feature_group_code: feature_value_code} at generation time"
    )
    profile_compliance = models.CharField(
        max_length=30, default="unknown",
        help_text="compliant | non_compliant | review_required | unknown"
    )
    non_compliant_groups = models.JSONField(default=list)
    generated_at = models.DateTimeField(default=timezone.now)
    generation_triggered_by = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "device_capability_evidence"

    def __str__(self):
        return f"CapabilityEvidence({self.device}, generated={self.generated_at})"


# ─── PR-B: Compatibility Marker & Data Quality Exception ─────────────────────

class CompatibilityMarker(models.Model):
    """
    PR-B promotion: Phase 1 CSV ingestion artifact.
    NOT feature truth. Raw compatibility assertion from import, pending normalization.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name="compatibility_markers")
    raw_attribute = models.CharField(max_length=200, help_text="Raw field name from CSV")
    raw_value = models.CharField(max_length=500, help_text="Raw value from CSV")
    normalized_feature_group = models.ForeignKey(
        FeatureGroup, null=True, blank=True, on_delete=models.SET_NULL,
        help_text="Set when normalization is suggested/confirmed"
    )
    normalized_feature_value = models.ForeignKey(
        FeatureValue, null=True, blank=True, on_delete=models.SET_NULL
    )
    normalization_status = models.CharField(
        max_length=30, default="pending",
        help_text="pending | suggested | confirmed | rejected | abandoned"
    )
    import_job_reference = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_compatibility_marker"


class DataQualityException(models.Model):
    """
    PR-B promotion: Raised when import data fails validation or normalization.
    Lifecycle: created → under_review → resolved | dismissed | unresolved
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, null=True, blank=True, on_delete=models.PROTECT, related_name="dqe_records")
    compatibility_marker = models.ForeignKey(
        CompatibilityMarker, null=True, blank=True, on_delete=models.PROTECT
    )
    exception_type = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=DQEStatus.choices, default=DQEStatus.CREATED)
    review_actor_reference = models.UUIDField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "device_data_quality_exception"
        indexes = [models.Index(fields=["status", "created_at"])]


class SuggestedNormalization(models.Model):
    """
    PR-B: Workflow proposal for promoting a CompatibilityMarker → DeviceFeatureAssignment.
    Part of the non-collapsible state chain.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compatibility_marker = models.ForeignKey(
        CompatibilityMarker, on_delete=models.PROTECT, related_name="normalizations"
    )
    suggested_feature_group = models.ForeignKey(FeatureGroup, on_delete=models.PROTECT)
    suggested_feature_value = models.ForeignKey(FeatureValue, on_delete=models.PROTECT)
    confidence_score = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=30, default="pending",
        help_text="pending | accepted | rejected | overridden"
    )
    accepted_by = models.UUIDField(null=True, blank=True)
    resulting_assignment = models.ForeignKey(
        DeviceFeatureAssignment, null=True, blank=True, on_delete=models.PROTECT
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_suggested_normalization"


# ─── My Devices (Buyer Device Portfolio) ─────────────────────────────────────

class BuyerDevicePortfolioReference(models.Model):
    """
    Each device a buyer has in their My Devices portfolio.
    Carries buyer-scope triad. Cross-buyer isolation enforced at queryset level.

    active_flag + change_source are PR hardening additions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name="portfolio_references")

    # Buyer-scope triad (required on all buyer-scoped entities)
    buyer_reference = models.UUIDField(db_index=True, help_text="User ID")
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)

    # State
    active_flag = models.BooleanField(default=True, db_index=True)
    change_source = models.CharField(max_length=30, choices=ChangeSource.choices)
    last_change_timestamp = models.DateTimeField(default=timezone.now)
    current_portfolio_snapshot_reference = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_buyer_portfolio_reference"
        unique_together = [("device", "buyer_reference", "company_scope_reference", "buyer_entity_reference")]
        indexes = [
            models.Index(fields=["buyer_reference", "company_scope_reference", "active_flag"]),
        ]

    def __str__(self):
        return f"Portfolio({self.device}, buyer={self.buyer_reference}, active={self.active_flag})"


class BuyerDevicePortfolioSnapshot(models.Model):
    """
    Frozen snapshot of a buyer's portfolio at a point in time.
    Referenced by Product Catalog projections.
    Immutable after creation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Buyer-scope triad
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)

    # Frozen device list
    device_ids = models.JSONField(help_text="List of Device IDs at snapshot time")
    device_count = models.PositiveIntegerField()

    # Trigger
    triggered_by_change_record = models.UUIDField(null=True, blank=True)
    snapshot_reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_buyer_portfolio_snapshot"
        indexes = [
            models.Index(fields=["buyer_reference", "company_scope_reference", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and BuyerDevicePortfolioSnapshot.objects.filter(pk=self.pk).exists():
            raise ValueError("BuyerDevicePortfolioSnapshot is immutable after creation.")
        super().save(*args, **kwargs)


class BuyerDevicePortfolioChangeRecord(models.Model):
    """
    Append-only record of every change to a buyer's portfolio.
    Emits device-catalog.my-devices.portfolio-changed event on creation.
    8 change_type values per spec.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio_reference = models.ForeignKey(
        BuyerDevicePortfolioReference, on_delete=models.PROTECT, related_name="change_records"
    )
    # Buyer-scope triad
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_entity_reference = models.UUIDField(db_index=True)

    change_type = models.CharField(max_length=30, choices=PortfolioChangeType.choices)
    change_source = models.CharField(max_length=30, choices=ChangeSource.choices)
    device = models.ForeignKey(Device, on_delete=models.PROTECT)

    # Actor evidence
    actor_reference = models.UUIDField(null=True, blank=True)
    service_trigger_reference = models.CharField(max_length=200, blank=True)
    actor_is_admin_on_behalf = models.BooleanField(default=False)

    # Resulting snapshot
    resulting_snapshot = models.ForeignKey(
        BuyerDevicePortfolioSnapshot, null=True, blank=True, on_delete=models.PROTECT
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "device_buyer_portfolio_change_record"
        indexes = [
            models.Index(fields=["buyer_reference", "company_scope_reference", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and BuyerDevicePortfolioChangeRecord.objects.filter(pk=self.pk).exists():
            raise ValueError("BuyerDevicePortfolioChangeRecord is append-only.")
        super().save(*args, **kwargs)
