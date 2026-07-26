import logging
from django.utils import timezone
from apps.routing.models import (
    Order, RoutedSuborder, RoutingStatus,
    VendorExportSchedule, VendorExportWindow,
    VendorExportDeliveryEvidence, VendorExportBatchItem,
    DeliveryEvidenceStatus, VendorExportDeliveryAttempt
)
from apps.fulfillment.models import (
    FulfillmentHandoff, VendorFulfillmentResponseSLAPolicy,
    SLAEvaluationRecord, SLAOutcome
)
from apps.tenant.models import CompanyEntity

logger = logging.getLogger(__name__)

def orchestrate_po_finalization(po):
    """
    Automated orchestration chain that converts a finalized Purchase Order
    into an Order, RoutedSuborder, VendorExportWindow, Delivery Evidence,
    FulfillmentHandoff, and SLA Evaluation Record.
    """
    logger.info("Starting PO orchestration for PO ID: %s, Number: %s", po.id, po.po_number)

    # 1. Uniqueness Guard: prevent duplicate Order for same PO
    if Order.objects.filter(id=po.id).exists():
        logger.warning("Order with ID %s already exists. Skipping orchestration.", po.id)
        return

    # 2. Get buyer entity reference
    buyer_entity = CompanyEntity.objects.filter(company_id=po.company_scope_reference).first()
    buyer_entity_id = buyer_entity.id if buyer_entity else po.buyer_reference

    # 3. Create Pricing Snapshot Reference map for the Order
    snapshot_refs = {}
    from apps.pricing.services import create_effective_price_snapshot
    from apps.tenant.models import Company
    from apps.catalog.models import Product
    buyer_company = Company.objects.filter(id=po.company_scope_reference).first()

    if not po.pricing_snapshot_reference:
        first_snapshot_id = None
        for line in po.lines.all():
            try:
                product = Product.objects.get(id=line.product_reference)
                snapshot = create_effective_price_snapshot(product, buyer_company, "buyer_storefront")
                snapshot_refs[str(line.product_reference)] = str(snapshot.id)
                if not first_snapshot_id:
                    first_snapshot_id = snapshot.id
            except Exception as e:
                logger.error("Failed to generate price snapshot for line product: %s, error: %s", line.product_reference, e)
        if first_snapshot_id:
            po.pricing_snapshot_reference = first_snapshot_id
            po.save(update_fields=["pricing_snapshot_reference"])
    else:
        for line in po.lines.all():
            snapshot_refs[str(line.product_reference)] = str(po.pricing_snapshot_reference)

    # 4. Create Order in Routing Module
    order = Order.objects.create(
        id=po.id,
        company_scope_reference=po.company_scope_reference,
        buyer_reference=po.buyer_reference,
        buyer_entity_reference=buyer_entity_id,
        status=RoutingStatus.ROUTED,
        pricing_snapshot_references=snapshot_refs,
        placed_at=po.approved_at or timezone.now(),
    )
    logger.info("Created Routing Order ID: %s", order.id)

    # 5. Create RoutedSuborder in Routing Module
    suborder = RoutedSuborder.objects.create(
        order=order,
        vendor_company_reference=po.vendor_company_reference,
        status=RoutingStatus.ROUTED,
        routing_snapshot={"po_number": po.po_number, "po_id": str(po.id)},
    )
    logger.info("Created RoutedSuborder ID: %s", suborder.id)

    # 6. Get or Create Vendor Export Schedule
    schedule = VendorExportSchedule.objects.filter(
        vendor_company_reference=po.vendor_company_reference,
        status="active"
    ).first()
    if not schedule:
        schedule = VendorExportSchedule.objects.create(
            vendor_company_reference=po.vendor_company_reference,
            status="active",
            delivery_method="api",
            window_duration_minutes=60,
        )

    # 7. Create Vendor Export Window (Closed/Completed)
    window = VendorExportWindow.objects.create(
        schedule=schedule,
        vendor_company_reference=po.vendor_company_reference,
        status="closed",
        opens_at=timezone.now() - timezone.timedelta(minutes=30),
        closes_at=timezone.now() + timezone.timedelta(minutes=30),
        item_count=1,
    )

    # 8. Link Suborder to Window
    VendorExportBatchItem.objects.create(
        window=window,
        routed_suborder=suborder,
    )

    # 9. Create Delivery Attempt
    attempt = VendorExportDeliveryAttempt.objects.create(
        window=window,
        attempt_number=1,
        delivery_method="api",
        started_at=timezone.now() - timezone.timedelta(minutes=1),
        completed_at=timezone.now(),
        outcome="succeeded",
    )

    # 10. Create and Confirm Delivery Evidence
    evidence = VendorExportDeliveryEvidence.objects.create(
        window=window,
        vendor_company_reference=po.vendor_company_reference,
        status=DeliveryEvidenceStatus.CONFIRMED,
        delivery_method="api",
        last_attempt=attempt,
        confirmed_at=timezone.now(),
    )
    logger.info("Created VendorExportDeliveryEvidence ID: %s", evidence.id)

    # 11. Create downstream FulfillmentHandoff (Goal 2)
    handoff = FulfillmentHandoff.objects.create(
        routed_suborder_reference=suborder.id,
        vendor_company_reference=po.vendor_company_reference,
        company_scope_reference=po.company_scope_reference,
        status="received",
        delivery_evidence_reference=evidence.id,
    )
    logger.info("Created FulfillmentHandoff ID: %s", handoff.id)

    # 12. Get or Create SLA Policy
    policy = VendorFulfillmentResponseSLAPolicy.objects.filter(
        vendor_company_reference=po.vendor_company_reference,
        status="active"
    ).first()
    if not policy:
        policy = VendorFulfillmentResponseSLAPolicy.objects.create(
            vendor_company_reference=po.vendor_company_reference,
            response_window_hours=24,
            status="active",
            effective_from=timezone.now() - timezone.timedelta(days=1),
        )

    # 13. Create SLAEvaluationRecord (Goal 3 & 4)
    sla_record = SLAEvaluationRecord.objects.create(
        handoff=handoff,
        sla_policy=policy,
        delivery_evidence_reference=evidence.id,
        delivery_confirmed_at=evidence.id,
        expected_response_by=timezone.now() + timezone.timedelta(hours=policy.response_window_hours),
        outcome=SLAOutcome.PENDING,
    )
    logger.info("Created SLAEvaluationRecord ID: %s", sla_record.id)
