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

                # Emit NPS alert/exception notification
                try:
                    from apps.notification.services import create_notification_request
                    create_notification_request(
                        event_type="sla.evaluation_violation",
                        source_module="fulfillment",
                        company_scope_reference=record.vendor_company_reference,
                        recipient_ids=[],
                        safe_payload_summary={
                            "sla_record_id": str(record.id),
                            "outcome": "LATE",
                            "delay_hours": round(delay_hours, 2),
                        },
                        source_record_id=record.id,
                    )
                except Exception as notif_ex:
                    logger.exception("Failed to emit SLA late notification: %s", notif_ex)

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

                # Emit NPS alert/exception notification
                try:
                    from apps.notification.services import create_notification_request
                    create_notification_request(
                        event_type="sla.evaluation_violation",
                        source_module="fulfillment",
                        company_scope_reference=record.vendor_company_reference,
                        recipient_ids=[],
                        safe_payload_summary={
                            "sla_record_id": str(record.id),
                            "outcome": "MISSING",
                        },
                        source_record_id=record.id,
                    )
                except Exception as notif_ex:
                    logger.exception("Failed to emit SLA missing notification: %s", notif_ex)

                evaluated_count += 1
            else:
                # Still within the window, keep pending
                pass

    logger.info("Completed SLA evaluations. Evaluated %d records.", evaluated_count)

