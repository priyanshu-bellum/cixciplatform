"""
Notification Platform Service — Models

Architecture rules:
- NPS owns delivery history; it does NOT own business state from source modules
- 10-step preference precedence ladder enforced in services.py
- Per-event surface (NotificationRequest, DeliveryAttempt) is DISTINCT from
  PR-C scheduled summary surface (ActivitySummaryConfiguration, ActivitySummaryDeliveryAttempt)
- External providers are delivery providers only — NOT source of truth for notification history
"""
import uuid
from django.db import models
from django.utils import timezone


class NotificationChannel(models.TextChoices):
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App"
    SMS = "sms", "SMS (placeholder)"
    WEBHOOK = "webhook", "Webhook / External (placeholder)"
    PUSH = "push", "Push Notification (placeholder)"


class DeliveryStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    QUEUED = "queued", "Queued"
    SENT = "sent", "Sent"
    DELIVERED = "delivered", "Delivered"
    FAILED = "failed", "Failed"
    BOUNCED = "bounced", "Bounced"
    SUPPRESSED = "suppressed", "Suppressed"
    DELAYED = "delayed", "Delayed"
    EXPIRED = "expired", "Expired"
    CANCELLED = "cancelled", "Cancelled"
    SUPERSEDED = "superseded", "Superseded"


class PreferenceOutcome(models.TextChoices):
    SEND = "send", "Send"
    BLOCK = "block", "Block"
    DELAY = "delay", "Delay"
    DIGEST = "digest", "Digest"
    REVIEW_REQUIRED = "review_required", "Review Required"
    SUPPRESS = "suppress", "Suppress"


class TemplateStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    APPROVED = "approved", "Approved"
    RETIRED = "retired", "Retired"


# ─── Notification Template ─────────────────────────────────────────────────────

class NotificationTemplate(models.Model):
    """
    Versioned notification template.
    Must use safe dynamic fields only — no sensitive payloads in templates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_code = models.CharField(max_length=150, db_index=True)
    version = models.PositiveIntegerField(default=1)
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    event_type = models.CharField(max_length=200, help_text="Source event that triggers this template")
    subject_template = models.CharField(max_length=500, blank=True)
    body_template = models.TextField()
    dynamic_fields = models.JSONField(default=list, help_text="Safe field names allowed in template rendering")
    redaction_rules = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=TemplateStatus.choices, default=TemplateStatus.DRAFT)
    locale = models.CharField(max_length=10, default="en")
    # Scope
    company_scope = models.UUIDField(null=True, blank=True, help_text="Null = platform-wide template")
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notification_template"
        unique_together = [("template_code", "version", "channel")]
        indexes = [models.Index(fields=["event_type", "channel", "status"])]

    def __str__(self):
        return f"{self.template_code} v{self.version} ({self.channel})"


# ─── Notification Preference ───────────────────────────────────────────────────

class PreferenceLevel(models.TextChoices):
    USER = "user", "User"
    ENTITY = "entity", "Entity"
    COMPANY = "company", "Company"


class NotificationPreference(models.Model):
    """
    Preference record. Evaluated in 10-step precedence ladder in services.py.
    Levels: company > entity > user (with required/system overriding all).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.CharField(max_length=10, choices=PreferenceLevel.choices)
    scope_id = models.UUIDField(db_index=True, help_text="User ID, Entity ID, or Company ID")
    event_type = models.CharField(max_length=200, blank=True, help_text="Blank = all events")
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices, blank=True)
    # Delivery preference
    is_enabled = models.BooleanField(default=True)
    use_digest = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    # Unsubscribe / suppression
    is_unsubscribed = models.BooleanField(default=False)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notification_preference"
        indexes = [models.Index(fields=["scope_id", "event_type", "channel"])]


# ─── Notification Request ──────────────────────────────────────────────────────

class NotificationRequest(models.Model):
    """
    Intake record. Created by source modules when they emit a notifiable event.
    NPS evaluates preferences and determines the delivery plan from this.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=200, db_index=True)
    source_module = models.CharField(max_length=100)
    source_record_id = models.UUIDField(null=True, blank=True)
    # Payload — minimal safe summary only (no full source payloads)
    safe_payload_summary = models.JSONField(default=dict)
    # Recipient scope (provided by source module — NPS does NOT infer eligibility)
    requested_recipient_ids = models.JSONField(default=list)
    company_scope_reference = models.UUIDField(db_index=True)
    # Template
    template_code = models.CharField(max_length=150, blank=True)
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices, default=NotificationChannel.EMAIL)
    # Idempotency
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    # Preference evaluation outcome
    preference_outcome = models.CharField(
        max_length=20, choices=PreferenceOutcome.choices, null=True, blank=True
    )
    preference_evaluation_detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notification_request"
        indexes = [models.Index(fields=["event_type", "company_scope_reference", "created_at"])]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            from django.db import transaction
            from .tasks import process_notification_request
            transaction.on_commit(lambda: process_notification_request.delay(str(self.id)))


# ─── Recipient Resolution Request ─────────────────────────────────────────────

class RecipientResolutionRequest(models.Model):
    """
    Records the recipient expansion result for a NotificationRequest.
    Cross-tenant denial enforced here — never expands outside company scope.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_request = models.OneToOneField(
        NotificationRequest, on_delete=models.PROTECT, related_name="recipient_resolution"
    )
    resolved_recipient_ids = models.JSONField(default=list)
    excluded_recipient_ids = models.JSONField(default=list, help_text="Inactive, suppressed, or cross-tenant excluded")
    role_expansion_snapshot = models.JSONField(default=dict)
    max_recipients_cap = models.PositiveIntegerField(default=500)
    cross_tenant_denied = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notification_recipient_resolution"


# ─── Delivery Attempt ──────────────────────────────────────────────────────────

class DeliveryAttempt(models.Model):
    """
    Per-event delivery attempt. Append-only lifecycle (status transitions via workflow).
    Provider callbacks are idempotent — duplicate callbacks collapse into existing attempt.
    External providers do NOT own CIXCI notification history.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_request = models.ForeignKey(
        NotificationRequest, on_delete=models.PROTECT, related_name="delivery_attempts"
    )
    recipient_id = models.UUIDField(db_index=True)
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.REQUESTED)
    # Provider evidence (coordination only — not CIXCI source of truth)
    provider_name = models.CharField(max_length=100, blank=True)
    provider_message_id = models.CharField(max_length=500, blank=True)
    provider_response_reference = models.JSONField(default=dict)
    # Retry
    attempt_number = models.PositiveSmallIntegerField(default=1)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    # Timestamps
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notification_delivery_attempt"
        indexes = [
            models.Index(fields=["recipient_id", "status"]),
            models.Index(fields=["notification_request", "attempt_number"]),
        ]


# ─── PR-C: Scheduled Summary Email Surface ────────────────────────────────────
# Distinct from per-event surface. Added here alongside existing entities.

class SummaryScheduleStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    RETIRED = "retired", "Retired"


class ActivitySummaryConfiguration(models.Model):
    """
    PR-C: Schedule configuration for the Scheduled System Admin Activity Summary Email.
    CIXCI System Admin only.

    Anti-loss invariant: last_successful_summary_cursor_reference advances ONLY
    via NPS Workflow 9 (Delivery Success / Cursor Advancement).
    Analytics NEVER writes to this cursor.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=SummaryScheduleStatus.choices, default=SummaryScheduleStatus.ACTIVE)
    # Schedule
    delivery_times = models.JSONField(help_text="List of HH:MM times in schedule_timezone")
    schedule_timezone = models.CharField(max_length=50, default="UTC")
    skip_weekends = models.BooleanField(default=False)
    skip_holidays = models.BooleanField(default=False)
    # Recipients (CIXCI System Admin only — Phase 1)
    explicit_recipient_ids = models.JSONField(default=list)
    # Anti-loss cursor — advanced ONLY by NPS Workflow 9
    last_successful_summary_cursor_reference = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(help_text="Must be CIXCI System Admin")

    class Meta:
        db_table = "notification_activity_summary_config"


class ActivitySummaryDeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    DISPATCHED = "dispatched", "Dispatched"
    ACKNOWLEDGED = "acknowledged", "Acknowledged (transport-layer only)"
    FAILED = "failed", "Failed"


class ActivitySummaryDeliveryAttempt(models.Model):
    """
    PR-C: Distinct from per-event DeliveryAttempt.
    'acknowledged' = transport-layer acknowledgement only (NOT read-receipt).
    Cursor does NOT advance on 'failed'.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration = models.ForeignKey(
        ActivitySummaryConfiguration, on_delete=models.PROTECT, related_name="delivery_attempts"
    )
    reporting_window_reference = models.UUIDField(help_text="Analytics ActivitySummaryReportingWindow ID")
    aggregation_record_reference = models.UUIDField(help_text="Analytics ActivitySummaryAggregationRecord ID")
    status = models.CharField(max_length=20, choices=ActivitySummaryDeliveryStatus.choices, default=ActivitySummaryDeliveryStatus.PENDING)
    effective_recipient_ids = models.JSONField(default=list)
    provider_response_reference = models.JSONField(default=dict)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notification_summary_delivery_attempt"
