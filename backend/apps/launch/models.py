"""
Launch & Event Management — Models (Proposal-level Phase 6)

Architecture rule: Launch operates as a coordination layer for readiness.
It does NOT own source-of-truth records for products, devices, or pricing.
"""
import uuid
from django.db import models
from django.utils import timezone


class LaunchStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PLANNING = "planning", "Planning"
    READINESS_CHECK = "readiness_check", "Readiness Check"
    BLOCKED = "blocked", "Blocked"
    READY = "ready", "Ready"
    LAUNCHED = "launched", "Launched"
    CANCELLED = "cancelled", "Cancelled"
    POSTPONED = "postponed", "Postponed"
    POST_LAUNCH_REVIEW = "post_launch_review", "Post-Launch Review"
    CLOSED = "closed", "Closed"


class LaunchEvent(models.Model):
    """
    A product or market launch event.
    Coordination layer only — does not own product, device, or pricing truth.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_scope_reference = models.UUIDField(db_index=True)
    name = models.CharField(max_length=300)
    status = models.CharField(max_length=30, choices=LaunchStatus.choices, default=LaunchStatus.DRAFT)
    target_launch_date = models.DateField(null=True, blank=True)
    # Source-module readiness references (read-only)
    product_readiness_references = models.JSONField(default=list)
    device_readiness_references = models.JSONField(default=list)
    pricing_readiness_references = models.JSONField(default=list)
    # Notification trigger references (NPS owns delivery)
    notification_trigger_references = models.JSONField(default=list)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "launch_event"
        indexes = [models.Index(fields=["company_scope_reference", "status"])]
