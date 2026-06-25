"""
Analytics & Reporting — Models (including PR-C Scheduled Summary Aggregation)

Architecture rules (spec.md):
- ActivitySummaryAggregationRecord is IMMUTABLE once created. Re-aggregation = new record.
- Carry-forward: failed windows are subsumed by next window's interval.
  Subsumed windows → superseded ONLY after subsuming window's delivery reaches acknowledged.
- No-empty-email: zero-activity window → suppressed_no_activity.
  Analytics emits suppression signal. Analytics does NOT advance NPS cursor.
  NPS consumes the signal and advances its own cursor.
- Source inputs consumed read-only: PR #91 (orders/shipping), PR #92 (exceptions),
  PR #94 (shipping/exceptions).
"""
import uuid
from django.db import models
from django.utils import timezone


class WindowStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    DELIVERY_FAILED = "delivery_failed", "Delivery Failed"
    SUPERSEDED = "superseded", "Superseded"
    SUPPRESSED_NO_ACTIVITY = "suppressed_no_activity", "Suppressed (No Activity)"


# ─── Reporting Read Models ─────────────────────────────────────────────────────

class ReportingMetric(models.Model):
    """Definition of a reportable metric. Analytics owns metric definitions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=100, unique=True)
    label = models.CharField(max_length=200)
    source_module = models.CharField(max_length=100)
    aggregation_method = models.CharField(max_length=50, help_text="count | sum | avg | max | min")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "analytics_reporting_metric"


class DataFreshnessMarker(models.Model):
    """Tracks when each source module's data was last ingested for analytics."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_module = models.CharField(max_length=100, db_index=True)
    source_event_type = models.CharField(max_length=200, blank=True)
    last_processed_at = models.DateTimeField()
    last_source_record_reference = models.UUIDField(null=True, blank=True)
    is_stale = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_data_freshness"
        unique_together = [("source_module", "source_event_type")]


# ─── PR-C: Scheduled Activity Summary Aggregation ────────────────────────────

class ActivitySummaryReportingWindow(models.Model):
    """
    PR-C: Time window for one scheduled summary generation cycle.

    Carry-forward discipline:
    - delivery_failed → next window subsumes this window's interval.
    - subsumed window → superseded ONLY after subsuming window delivery acknowledged.
    - suppressed_no_activity: zero-activity window; suppression signal emitted;
      Analytics does NOT advance NPS cursor.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    window_start = models.DateTimeField()
    window_end = models.DateTimeField()
    status = models.CharField(max_length=30, choices=WindowStatus.choices, default=WindowStatus.ACTIVE)

    # Carry-forward: reference to the window that subsumed this one (if superseded)
    subsumed_by_window = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="subsumed_windows"
    )

    # Effective interval (union of primary + all subsumed intervals)
    effective_start = models.DateTimeField(help_text="Earliest start of this + all subsumed windows")

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "analytics_summary_reporting_window"
        indexes = [models.Index(fields=["status", "window_start"])]


class ActivitySummaryAggregationRecord(models.Model):
    """
    PR-C: The actual aggregated data for a reporting window.
    IMMUTABLE once created. Re-aggregation produces a NEW record (never mutates).

    Source inputs consumed read-only:
    - PR #91 events (order routing, vendor export)
    - PR #92 events (SLA exceptions)
    - PR #94 events (shipping/exceptions — placeholder)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    window = models.ForeignKey(
        ActivitySummaryReportingWindow, on_delete=models.PROTECT, related_name="aggregation_records"
    )
    is_current = models.BooleanField(default=True, db_index=True)

    # Source fact references (deduplicated union of primary + subsumed windows)
    source_fact_references = models.JSONField(default=list,
        help_text="List of source event/record references consumed in this aggregation")

    # Aggregated metrics (read-only from source modules)
    orders_count = models.PositiveIntegerField(default=0)
    shipments_count = models.PositiveIntegerField(default=0)
    sla_exceptions_count = models.PositiveIntegerField(default=0)
    late_imports_count = models.PositiveIntegerField(default=0)
    missing_imports_count = models.PositiveIntegerField(default=0)
    partial_imports_count = models.PositiveIntegerField(default=0)

    result_discriminator = models.CharField(max_length=50,
        help_text="has_activity | suppressed_no_activity")

    aggregated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "analytics_summary_aggregation_record"

    def save(self, *args, **kwargs):
        if self.pk and ActivitySummaryAggregationRecord.objects.filter(pk=self.pk).exists():
            raise ValueError(
                "ActivitySummaryAggregationRecord is immutable. "
                "Re-aggregation must create a new record."
            )
        super().save(*args, **kwargs)
