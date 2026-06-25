"""
Celery tasks for Analytics & Reporting.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .models import (
    ActivitySummaryReportingWindow, ActivitySummaryAggregationRecord, WindowStatus
)
from apps.routing.models import Order
from apps.fulfillment.models import (
    DeliveryDateEvidence, LateFulfillmentImportException,
    MissingFulfillmentImportException, PartialFulfillmentResponseException
)

logger = logging.getLogger(__name__)


@shared_task(name="apps.analytics.tasks.aggregate_reporting_window_metrics", ignore_result=True)
def aggregate_reporting_window_metrics(window_id):
    """
    Background task to run aggregations for a specific reporting window.
    """
    logger.info("Starting aggregation for ActivitySummaryReportingWindow: %s", window_id)
    try:
        window = ActivitySummaryReportingWindow.objects.get(id=window_id)
    except ActivitySummaryReportingWindow.DoesNotExist:
        logger.error("ActivitySummaryReportingWindow with ID %s does not exist.", window_id)
        return

    # Check if this window was already processed or superseded
    if window.status in [WindowStatus.SUPERSEDED, WindowStatus.SUPPRESSED_NO_ACTIVITY]:
        logger.info("Window %s has status %s, skipping aggregation.", window_id, window.status)
        return

    effective_start = window.effective_start
    window_end = window.window_end

    # 1. Query metrics from source modules
    orders = Order.objects.filter(placed_at__range=(effective_start, window_end))
    orders_count = orders.count()

    shipments = DeliveryDateEvidence.objects.filter(created_at__range=(effective_start, window_end))
    shipments_count = shipments.count()

    late_exceptions = LateFulfillmentImportException.objects.filter(created_at__range=(effective_start, window_end))
    late_count = late_exceptions.count()

    missing_exceptions = MissingFulfillmentImportException.objects.filter(created_at__range=(effective_start, window_end))
    missing_count = missing_exceptions.count()

    partial_exceptions = PartialFulfillmentResponseException.objects.filter(created_at__range=(effective_start, window_end))
    partial_count = partial_exceptions.count()

    sla_exceptions_count = late_count + missing_count + partial_count

    # Construct trace-grade source fact references
    source_facts = []
    source_facts.extend([{"type": "order", "id": str(o.id)} for o in orders])
    source_facts.extend([{"type": "shipment_evidence", "id": str(s.id)} for s in shipments])
    source_facts.extend([{"type": "late_exception", "id": str(le.id)} for le in late_exceptions])
    source_facts.extend([{"type": "missing_exception", "id": str(me.id)} for me in missing_exceptions])
    source_facts.extend([{"type": "partial_exception", "id": str(pe.id)} for pe in partial_exceptions])

    # 2. Determine activity
    has_activity = (orders_count > 0 or shipments_count > 0 or sla_exceptions_count > 0)

    if not has_activity:
        # Zero-activity window logic
        logger.info("Window %s has zero activity. Suppressing summary.", window_id)
        ActivitySummaryReportingWindow.objects.filter(id=window.id).update(
            status=WindowStatus.SUPPRESSED_NO_ACTIVITY
        )
        # Emit event (log emission as structured event)
        logger.info(
            "EVENT_EMITTED: analytics.activity-summary-window.evaluated | resultDiscriminator=suppressed_no_activity"
        )
        return

    # 3. Create immutable summary aggregation record
    # Mark any previous records for this window as not current
    ActivitySummaryAggregationRecord.objects.filter(window=window).update(is_current=False)

    aggregation = ActivitySummaryAggregationRecord.objects.create(
        window=window,
        is_current=True,
        source_fact_references=source_facts,
        orders_count=orders_count,
        shipments_count=shipments_count,
        sla_exceptions_count=sla_exceptions_count,
        late_imports_count=late_count,
        missing_imports_count=missing_count,
        partial_imports_count=partial_count,
        result_discriminator="has_activity",
        aggregated_at=timezone.now()
    )

    logger.info(
        "Aggregation record %s created for window %s: orders=%d, shipments=%d, exceptions=%d",
        aggregation.id, window_id, orders_count, shipments_count, sla_exceptions_count
    )
