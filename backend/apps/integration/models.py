"""
Integration Management — Models

Architecture rules (spec.md):
- Integration Management is a COORDINATION layer, not a source of truth for business state.
- External-Tool-Not-Source-of-Truth Rule: external systems provide coordination/evidence only.
  Source modules remain authoritative.
- External IDs MUST NOT replace internal CIXCI IDs.
- QuickBooks accounting: Invoice Management creates the handoff REQUEST;
  Integration Management owns transport and records outcome.
"""
import uuid
from django.db import models
from django.utils import timezone


class ConnectorType(models.TextChoices):
    QUICKBOOKS = "quickbooks", "QuickBooks"
    SFTP = "sftp", "SFTP"
    REST_API = "rest_api", "REST API"
    WEBHOOK = "webhook", "Webhook"
    EMAIL = "email", "Email"
    MANUAL = "manual", "Manual"
    CSV = "csv", "CSV File"


class ConnectionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    RETIRED = "retired", "Retired"


class DeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_FLIGHT = "in_flight", "In Flight"
    DELIVERED = "delivered", "Delivered"
    FAILED = "failed", "Failed"
    RETRYING = "retrying", "Retrying"
    SUPERSEDED = "superseded", "Superseded"


# ─── External Connection ──────────────────────────────────────────────────────

class ExternalConnection(models.Model):
    """
    Represents a configured integration channel to an external system.
    Integration Management owns transport; source modules remain authoritative.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_scope_reference = models.UUIDField(db_index=True)
    connector_type = models.CharField(max_length=30, choices=ConnectorType.choices)
    status = models.CharField(max_length=20, choices=ConnectionStatus.choices, default=ConnectionStatus.DRAFT)
    label = models.CharField(max_length=200)
    # Config stored encrypted or in vault reference — never plain text secrets
    config_reference = models.CharField(max_length=500, blank=True,
        help_text="Vault key or encrypted config reference — NOT raw credentials")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "integration_external_connection"
        indexes = [models.Index(fields=["company_scope_reference", "connector_type", "status"])]


# ─── External ID Mapping ──────────────────────────────────────────────────────

class ExternalIdMapping(models.Model):
    """
    Maps a CIXCI internal ID to an external system ID.
    NEVER replaces the CIXCI internal ID with the external ID.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(ExternalConnection, on_delete=models.PROTECT, related_name="id_mappings")
    cixci_module = models.CharField(max_length=100)
    cixci_record_type = models.CharField(max_length=150)
    cixci_record_id = models.UUIDField(db_index=True)
    external_id = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_external_id_mapping"
        unique_together = [("connection", "cixci_record_id")]


# ─── External Action Request ──────────────────────────────────────────────────

class ExternalActionRequest(models.Model):
    """
    A request for Integration Management to perform an external action.
    Created by source modules (e.g., Invoice Management creating a QB handoff request).
    Integration Management records outcome; source module remains authoritative.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(ExternalConnection, on_delete=models.PROTECT, related_name="action_requests")
    source_module = models.CharField(max_length=100)
    action_type = models.CharField(max_length=100,
        help_text="e.g. quickbooks_invoice_post, vendor_order_export, sftp_upload")
    source_record_id = models.UUIDField(db_index=True)
    payload_reference = models.JSONField(default=dict,
        help_text="Sanitized payload for the external action — no sensitive data in plaintext")
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_external_action_request"


class ExternalActionOutcome(models.Model):
    """
    Records the outcome of an ExternalActionRequest.
    This is Integration Management's record — NOT authoritative business state.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.OneToOneField(
        ExternalActionRequest, on_delete=models.PROTECT, related_name="outcome"
    )
    outcome_status = models.CharField(max_length=30,
        help_text="success | failed | partial | timed_out | rejected_by_external")
    external_reference_id = models.CharField(max_length=500, blank=True,
        help_text="External system's ID for this action — stored as reference only")
    response_summary = models.JSONField(default=dict)
    completed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_external_action_outcome"


# ─── Webhook Delivery (Outbound) ──────────────────────────────────────────────

class WebhookDelivery(models.Model):
    """Outbound webhook delivery with idempotency, retry, and redaction."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(ExternalConnection, on_delete=models.PROTECT, related_name="webhook_deliveries")
    event_type = models.CharField(max_length=200, db_index=True)
    payload_hash = models.CharField(max_length=512, blank=True)
    status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    last_response_code = models.PositiveSmallIntegerField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=255, db_index=True)
    is_redacted = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_webhook_delivery"
        indexes = [models.Index(fields=["event_type", "status"])]


# ─── Inbound Webhook Receipt ──────────────────────────────────────────────────

class InboundWebhookReceipt(models.Model):
    """
    Records every inbound webhook received. Signature verified; deduplicated by
    provider_event_id. Replay-safe.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(ExternalConnection, on_delete=models.PROTECT, related_name="inbound_receipts")
    provider_event_id = models.CharField(max_length=500, db_index=True)
    event_type = models.CharField(max_length=200)
    signature_verified = models.BooleanField(default=False)
    is_duplicate = models.BooleanField(default=False)
    processing_status = models.CharField(max_length=30, default="received",
        help_text="received | processing | processed | failed | ignored")
    received_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_inbound_webhook_receipt"
        unique_together = [("connection", "provider_event_id")]


# ─── Company API Key (B2B Integration) ────────────────────────────────────────

class CompanyAPIKey(models.Model):
    """
    Represents an API key generated by a buyer (or other company type) admin
    to authenticate external scripts/storefronts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_scope_reference = models.UUIDField(db_index=True)
    label = models.CharField(max_length=255)
    token = models.CharField(max_length=128, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "integration_company_api_key"
        verbose_name = "Company API Key"
        verbose_name_plural = "Company API Keys"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.label} ({self.token[:12]}...)"


class VendorCatalogConnection(models.Model):
    """Vendor-owned catalog transport, selected by the saved Company API mode."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company = models.ForeignKey("tenant.Company", on_delete=models.PROTECT, related_name="catalog_connections")
    label = models.CharField(max_length=200)
    endpoint_url = models.URLField(max_length=1000)
    auth_type = models.CharField(max_length=20, choices=[(v, v) for v in ("bearer", "api_key", "basic", "none")], default="bearer")
    auth_header = models.CharField(max_length=64, default="X-API-Key")
    encrypted_credentials = models.TextField(blank=True, editable=False)
    from .catalog_config import default_catalog_config
    config = models.JSONField(default=default_catalog_config)
    config_version = models.UUIDField(default=uuid.uuid4, editable=False)
    schedule_enabled = models.BooleanField(default=False)
    is_retired = models.BooleanField(default=False)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    next_sync_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_watermark = models.CharField(max_length=100, blank=True)
    last_error_code = models.CharField(max_length=80, blank=True)
    created_by = models.ForeignKey("tenant.User", null=True, on_delete=models.PROTECT, related_name="created_catalog_connections")
    updated_by = models.ForeignKey("tenant.User", null=True, on_delete=models.PROTECT, related_name="updated_catalog_connections")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "integration_vendor_catalog_connection"
        indexes = [models.Index(fields=["schedule_enabled", "is_retired", "next_sync_at"])]


class VendorCatalogSyncRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(VendorCatalogConnection, on_delete=models.PROTECT, related_name="sync_runs")
    requested_by = models.ForeignKey("tenant.User", null=True, on_delete=models.PROTECT)
    trigger = models.CharField(max_length=20, default="manual")
    status = models.CharField(max_length=20, default="queued", db_index=True)
    config_version = models.UUIDField()
    page_cursor = models.JSONField(null=True, blank=True)
    page_index = models.PositiveIntegerField(default=0)
    cursor_hashes = models.JSONField(default=list)
    rows_seen = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    unchanged_count = models.PositiveIntegerField(default=0)
    review_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    error_code = models.CharField(max_length=80, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    lease_token = models.UUIDField(null=True, blank=True)
    lease_expires_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_vendor_catalog_sync_run"
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["connection"], condition=models.Q(status__in=["queued", "running", "retrying"]), name="catalog_one_active_run")]


class VendorCatalogItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(VendorCatalogConnection, on_delete=models.PROTECT, related_name="source_items")
    external_id = models.CharField(max_length=200)
    product = models.OneToOneField("catalog.Product", null=True, blank=True, on_delete=models.PROTECT, related_name="vendor_catalog_source")
    payload = models.JSONField(default=dict)
    source_hash = models.CharField(max_length=64)
    applied_config_version = models.UUIDField(null=True, blank=True, editable=False)
    is_listed = models.BooleanField(default=True)
    review_required = models.BooleanField(default=False, db_index=True)
    review_errors = models.JSONField(default=list)
    last_seen_run = models.ForeignKey(VendorCatalogSyncRun, null=True, on_delete=models.PROTECT)
    first_seen_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "integration_vendor_catalog_item"
        constraints = [models.UniqueConstraint(fields=["connection", "external_id"], name="catalog_connection_remote_id")]
        indexes = [models.Index(fields=["connection", "is_listed", "review_required"])]


class VendorCatalogBudget(models.Model):
    vendor_company = models.ForeignKey("tenant.Company", on_delete=models.PROTECT)
    origin = models.CharField(max_length=255)
    day = models.DateField()
    rows = models.PositiveIntegerField(default=0)
    requests = models.PositiveIntegerField(default=0)
    window_started_at = models.DateTimeField(default=timezone.now)
    window_requests = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "integration_vendor_catalog_budget"
        constraints = [models.UniqueConstraint(fields=["vendor_company", "origin", "day"], name="catalog_vendor_daily_budget")]


from .storefront_models import BuyerStorefront  # noqa: E402,F401
from .commerce_models import VendorCommerceProfile, SupplierOrderDispatch, VendorWebhookReceipt, VendorCommercePollRun  # noqa: E402,F401

