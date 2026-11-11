import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def recalculate_affected_buyer_visibility(vendor_company_id, region_code, event_id):
    """
    Recalculate active Buyers at their explicit Entity Operating Region scope.
    Company address/coverage fields never choose an entity or user.

    Updates the RegionChangeEvent with affected_buyer_count.
    """
    from apps.tenant.models import User, RegionChangeEvent
    from apps.catalog.services import ensure_buyer_compatibility_projection
    users = User.objects.filter(
        is_active=True, entity__status="active", entity__company__status="active",
        entity__company__company_type="buyer", entity__operating_region__code=region_code,
    ).select_related("entity__company")
    affected_companies = set()
    for user in users.iterator():
        # Never choose an arbitrary first user/entity or reuse another entity's snapshot.
        ensure_buyer_compatibility_projection(user, trigger="vendor_region_changed", force=True)
        affected_companies.add(user.entity.company_id)
    affected_count = len(affected_companies)

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
