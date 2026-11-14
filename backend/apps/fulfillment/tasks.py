"""
Celery tasks for Fulfillment & Returns.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .models import (
    SLAEvaluationRecord, SLAOutcome, ExceptionStatus,
    LateFulfillmentImportException, MissingFulfillmentImportException,
    BuyerUpdateReadySignal, BuyerSignalStatus,
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


@shared_task(name="apps.fulfillment.tasks.dispatch_buyer_signals", ignore_result=True)
def dispatch_buyer_signals():
    """
    Process eligible BuyerUpdateReadySignals — notify buyers when all vendors
    have confirmed shipment/delivery for an order.
    Batch-loads orders and handoffs to avoid N+1 per signal.
    """
    from apps.fulfillment.models import FulfillmentHandoff
    from apps.routing.models import Order, RoutedSuborder

    eligible = list(BuyerUpdateReadySignal.objects.filter(
        status=BuyerSignalStatus.ELIGIBLE, all_vendors_confirmed=True
    )[:100])

    if not eligible:
        return

    order_ids = [s.order_reference for s in eligible]
    orders = {o.pk: o for o in Order.objects.filter(pk__in=order_ids)}

    sub_ids_by_order = {}
    for sub in RoutedSuborder.objects.filter(order_id__in=order_ids).only('id', 'order_id'):
        sub_ids_by_order.setdefault(sub.order_id, []).append(sub.id)

    all_sub_ids = [sid for sids in sub_ids_by_order.values() for sid in sids]
    handoffs_by_order = {}
    for h in FulfillmentHandoff.objects.filter(routed_suborder_reference__in=all_sub_ids):
        for oid, sids in sub_ids_by_order.items():
            if h.routed_suborder_reference in sids:
                handoffs_by_order.setdefault(oid, []).append(h)
                break

    dispatched = 0
    for signal in eligible:
        try:
            order = orders.get(signal.order_reference)
            if not order:
                BuyerUpdateReadySignal.objects.filter(pk=signal.pk).update(
                    status=BuyerSignalStatus.FAILED)
                continue

            handoffs = handoffs_by_order.get(order.pk, [])
            payload = {
                "order_id": str(order.order_id or order.pk),
                "buyer_reference": str(signal.buyer_reference),
                "update_kind": signal.update_kind,
                "vendor_count": signal.expected_vendor_count,
                "shipments": [{
                    "vendor_company_reference": str(h.vendor_company_reference),
                    "status": h.status,
                    "shipping_carrier": h.shipping_carrier or "",
                    "tracking_number": h.tracking_number or "",
                    "shipped_date": str(h.shipped_date) if h.shipped_date else None,
                    "delivered_date": str(h.delivered_date) if h.delivered_date else None,
                } for h in handoffs],
            }

            try:
                from apps.notification.services import create_notification_request
                create_notification_request(
                    event_type=f"buyer.order.{signal.update_kind}_complete",
                    source_module="fulfillment",
                    company_scope_reference=signal.buyer_reference,
                    recipient_ids=[],
                    safe_payload_summary=payload,
                    source_record_id=signal.pk,
                )
            except Exception:
                logger.warning("Notification service unavailable for signal %s", signal.pk)

            BuyerUpdateReadySignal.objects.filter(pk=signal.pk).update(
                status=BuyerSignalStatus.DISPATCHED,
                dispatched_at=timezone.now(),
            )
            dispatched += 1
        except Exception:
            logger.exception("Failed to dispatch buyer signal %s", signal.pk)
            BuyerUpdateReadySignal.objects.filter(pk=signal.pk).update(
                status=BuyerSignalStatus.FAILED)

    logger.info("Dispatched %d buyer update signals.", dispatched)


@shared_task(name="apps.fulfillment.tasks.poll_carrier_tracking", ignore_result=True)
def poll_carrier_tracking():
    """
    Poll carrier APIs for shipments that have tracking info but aren't delivered yet.
    No-op until CARRIER_TRACKER_BACKEND is configured (e.g. 'easypost').
    """
    from .carrier_tracking import poll_manual_shipments
    result = poll_manual_shipments()
    if result.get('status') != 'skipped':
        logger.info("Carrier tracking poll: %s", result)

