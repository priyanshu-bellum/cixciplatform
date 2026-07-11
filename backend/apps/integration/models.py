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

