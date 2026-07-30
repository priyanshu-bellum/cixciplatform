import logging
from django.utils import timezone
from apps.routing.models import (
    VendorExportWindow, VendorExportDeliveryAttempt, VendorExportDeliveryEvidence,
    DeliveryEvidenceStatus, RoutingStatus
)
from apps.fulfillment.models import (
    FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy,
    SLAEvaluationRecord, SLAOutcome
)

logger = logging.getLogger(__name__)


def handle_successful_export_delivery(window_id, delivery_attempt):
    """
    Callback triggered when the notification delivery succeeds.
    Updates the export window attempts, confirms delivery evidence,
    and transitions related orders/suborders.
    """
    logger.info("Handling successful export delivery for window %s", window_id)
    window = VendorExportWindow.objects.filter(id=window_id).first()
    if not window:
        logger.error("VendorExportWindow not found: %s", window_id)
        return

    # Update attempt
    attempt = VendorExportDeliveryAttempt.objects.filter(window=window, outcome="in_progress").first()
    if attempt:
        attempt.outcome = "succeeded"
        attempt.completed_at = timezone.now()
        attempt.provider_reference = str(delivery_attempt.id)
        attempt.save(update_fields=["outcome", "completed_at", "provider_reference"])
    else:
        attempt = VendorExportDeliveryAttempt.objects.create(
            window=window,
            attempt_number=1,
            delivery_method="email",
            started_at=timezone.now(),
            completed_at=timezone.now(),
            outcome="succeeded",
            provider_reference=str(delivery_attempt.id)
        )

    # Create/update evidence
    evidence, created = VendorExportDeliveryEvidence.objects.get_or_create(
        window=window,
        defaults={
            "vendor_company_reference": window.vendor_company_reference,
            "status": DeliveryEvidenceStatus.CONFIRMED,
            "delivery_method": "email",
            "last_attempt": attempt,
            "confirmed_at": timezone.now()
        }
    )
    if not created:
        evidence.status = DeliveryEvidenceStatus.CONFIRMED
        evidence.last_attempt = attempt
        evidence.confirmed_at = timezone.now()
        evidence.save(update_fields=["status", "last_attempt", "confirmed_at"])

    # Update window status
    window.status = "closed"
    window.save(update_fields=["status"])

    # Update export logs send result
    from apps.routing.models import VendorOrderExportLog
    VendorOrderExportLog.objects.filter(window=window).update(email_send_result="success")

    # Transition suborders and parent orders
    batch_items = window.batch_items.select_related("routed_suborder", "routed_suborder__order")
    for item in batch_items:
        suborder = item.routed_suborder
        suborder.status = RoutingStatus.PROCESSING
        suborder.save(update_fields=["status"])

        # Check if parent order is now fully processing
        order = suborder.order
        all_processed = True
        for o_sub in order.routed_suborders.all():
            if o_sub.status not in [RoutingStatus.PROCESSING, "shipped", "delivered", "closed"]:
                all_processed = False
                break
        if all_processed:
            order.status = RoutingStatus.PROCESSING
            order.save(update_fields=["status"])

        # Create Fulfillment Handoff
        handoff, h_created = FulfillmentHandoff.objects.get_or_create(
            routed_suborder_reference=suborder.id,
            defaults={
                "vendor_company_reference": window.vendor_company_reference,
                "company_scope_reference": order.company_scope_reference,
                "status": "shipment_pending",
                "delivery_evidence_reference": evidence.id
            }
        )
        if not h_created:
            handoff.status = "shipment_pending"
            handoff.delivery_evidence_reference = evidence.id
            handoff.save(update_fields=["status", "delivery_evidence_reference"])

        # Ensure SLA Policy exists
        policy = VendorFulfillmentResponseSLAPolicy.objects.filter(
            vendor_company_reference=window.vendor_company_reference,
            status="active"
        ).first()
        if not policy:
            policy = VendorFulfillmentResponseSLAPolicy.objects.create(
                vendor_company_reference=window.vendor_company_reference,
                response_window_hours=24,
                status="active",
                effective_from=timezone.now() - timezone.timedelta(days=1),
            )

        # Create SLA Evaluation Record
        SLAEvaluationRecord.objects.get_or_create(
            handoff=handoff,
            defaults={
                "sla_policy": policy,
                "delivery_evidence_reference": evidence.id,
                "delivery_confirmed_at": evidence.id,
                "expected_response_by": timezone.now() + timezone.timedelta(hours=policy.response_window_hours),
                "outcome": SLAOutcome.PENDING,
            }
        )


def handle_failed_export_delivery(window_id, delivery_attempt, error_message="Unknown error"):
    """
    Callback triggered when the notification delivery fails.
    Updates the export window and delivery attempt status to indicate failure.
    """
    logger.error("Handling failed export delivery for window %s: %s", window_id, error_message)
    window = VendorExportWindow.objects.filter(id=window_id).first()
    if not window:
        logger.error("VendorExportWindow not found: %s", window_id)
        return

    # Update attempt
    attempt = VendorExportDeliveryAttempt.objects.filter(window=window, outcome="in_progress").first()
    if attempt:
        attempt.outcome = "failed"
        attempt.completed_at = timezone.now()
        attempt.save(update_fields=["outcome", "completed_at"])
    else:
        attempt = VendorExportDeliveryAttempt.objects.create(
            window=window,
            attempt_number=1,
            delivery_method="email",
            started_at=timezone.now(),
            completed_at=timezone.now(),
            outcome="failed",
        )

    # Update window status
    window.status = "cancelled"
    window.save(update_fields=["status"])

    # Update export logs send result
    from apps.routing.models import VendorOrderExportLog
    VendorOrderExportLog.objects.filter(window=window).update(email_send_result=f"failed: {error_message}")

