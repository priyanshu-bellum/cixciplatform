import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def recalculate_affected_buyer_visibility(vendor_company_id, region_code, event_id):
    """
    Find all active buyer companies whose approved_regions contains the changed
    region_code and recalculate their compatibility projections.

    Updates the RegionChangeEvent with affected_buyer_count.
    """
    from apps.tenant.models import Company, CompanyStatus, CompanyType, RegionChangeEvent
    from django.db.models import Q

    # Find all active buyer companies whose approved_regions contains this region
    region_filter = Q(approved_regions__icontains=f'"{region_code}"')
    affected_buyers = Company.objects.filter(
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
    ).filter(region_filter)

    affected_count = 0
    for buyer in affected_buyers:
        try:
            # Find active users for this buyer to resolve the buyer scope triad
            from apps.tenant.models import User
            buyer_user = User.objects.filter(
                entity__company=buyer,
                is_active=True,
            ).first()

            if not buyer_user or not buyer_user.entity:
                continue

            from apps.catalog.services import recalculate_buyer_compatibility_projection
            from apps.devices.models import BuyerDevicePortfolioSnapshot

            # Get the latest portfolio snapshot for this buyer
            snapshot = BuyerDevicePortfolioSnapshot.objects.filter(
                buyer_reference=buyer_user.id,
                company_scope_reference=buyer.id,
                buyer_entity_reference=buyer_user.entity_id,
            ).order_by("-created_at").first()

            if not snapshot:
                continue

            recalculate_buyer_compatibility_projection(
                buyer_reference=buyer_user.id,
                company_scope_reference=buyer.id,
                buyer_entity_reference=buyer_user.entity_id,
                portfolio_snapshot_reference=snapshot.id,
                trigger="vendor_region_changed",
            )
            affected_count += 1
        except Exception as e:
            logger.error(
                f"Failed to recalculate buyer visibility for buyer {buyer.id}: {e}"
            )

    # Update the event with affected buyer count (direct SQL to avoid immutability)
    try:
        RegionChangeEvent.objects.filter(id=event_id).update(
            affected_buyer_count=affected_count
        )
    except Exception as e:
        logger.error(f"Failed to update RegionChangeEvent {event_id}: {e}")

    logger.info(
        f"Recalculated buyer visibility for {affected_count} buyers "
        f"after region change on vendor {vendor_company_id}"
    )
    return affected_count
