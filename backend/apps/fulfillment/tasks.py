"""
Celery tasks for Fulfillment & Returns.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .models import (
    SLAEvaluationRecord, SLAOutcome, ExceptionStatus,
    LateFulfillmentImportException, MissingFulfillmentImportException
)

logger = logging.getLogger(__name__)


@shared_task(name="apps.fulfillment.tasks.evaluate_vendor_slas", ignore_result=True)
def evaluate_vendor_slas():
    """
    Background task to evaluate pending SLA evaluations.
    Runs periodically (e.g. every 15 minutes).
    """
    logger.info("Starting evaluation of pending vendor SLAs.")
    now = timezone.now()

    # Find pending evaluations
    pending_evals = SLAEvaluationRecord.objects.filter(outcome=SLAOutcome.PENDING)
    evaluated_count = 0

    for record in pending_evals:
        # Check if the import arrived
        received_at = record.fulfillment_import_received_timestamp

        if received_at:
            # Import has arrived
            if received_at <= record.expected_response_by:
                # Arrived on time!
                SLAEvaluationRecord.objects.filter(id=record.id).update(
                    outcome=SLAOutcome.ON_TIME,
                    evaluated_at=now
                )
                logger.info("SLA Evaluation %s: ON_TIME", record.id)
            else:
                # Arrived late!
                SLAEvaluationRecord.objects.filter(id=record.id).update(
                    outcome=SLAOutcome.LATE,
                    evaluated_at=now
                )
                # Create exception
                delay = received_at - record.expected_response_by
                delay_hours = delay.total_seconds() / 3600.0
                LateFulfillmentImportException.objects.create(
                    sla_evaluation=record,
                    status=ExceptionStatus.OPEN,
                    actual_import_received_at=received_at,
                    delay_hours=delay_hours
                )
                logger.warning("SLA Evaluation %s: LATE by %.2f hours", record.id, delay_hours)
            evaluated_count += 1

        else:
            # Import has NOT arrived
            if now > record.expected_response_by:
                # Expected window passed and still no import -> MISSING
                SLAEvaluationRecord.objects.filter(id=record.id).update(
                    outcome=SLAOutcome.MISSING,
                    evaluated_at=now
                )
                # Create exception
                MissingFulfillmentImportException.objects.create(
                    sla_evaluation=record,
                    status=ExceptionStatus.OPEN
                )
                logger.warning("SLA Evaluation %s: MISSING (response window expired)", record.id)
                evaluated_count += 1
            else:
                # Still within the window, keep pending
                pass

    logger.info("Completed SLA evaluations. Evaluated %d records.", evaluated_count)
