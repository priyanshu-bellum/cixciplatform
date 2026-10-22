"""
Device Catalog — Portfolio Service

Implements My Devices portfolio changes with:
- Non-collapsible state chain enforcement
- Buyer-scope triad validation
- Snapshot creation on every portfolio mutation
- Event emission for downstream consumers (Product Catalog projection recalculation)
"""
import logging
from uuid import UUID
from django.db import transaction
from django.utils import timezone
from apps.tenant.services import check_access

logger = logging.getLogger(__name__)


def get_company_portfolio_device_ids(company_scope_reference, buyer_entity_reference) -> list:
    """
    Active device ids in the buyer company's My Devices portfolio.

    The portfolio is company-scoped business data (every user of the buyer
    entity sees the same My Devices list), so reads must not be restricted to
    the user who happened to add the device.
    """
    from .models import BuyerDevicePortfolioReference

    filters = {
        "company_scope_reference": company_scope_reference,
        "active_flag": True,
    }
    if buyer_entity_reference is not None:
        filters["buyer_entity_reference"] = buyer_entity_reference

    device_ids = []
    seen = set()
    rows = (
        BuyerDevicePortfolioReference.objects.filter(**filters)
        .order_by("created_at", "id")
        .values_list("device_id", flat=True)
    )
    for device_id in rows:
        if device_id in seen:
            continue
        seen.add(device_id)
        device_ids.append(device_id)
    return device_ids


def add_device_to_portfolio(user, device_id: UUID, admin_on_behalf: bool = False) -> dict:
    """
    Add a device to a buyer's My Devices portfolio.

    The portfolio is company-scoped business data: every user of the buyer
    entity reads and manages the same list. The buyer-scope triad is still
    enforced (company_scope + buyer_entity), so cross-buyer interference
    remains architecturally impossible; only the per-user keying was dropped.

    State chain:
      BuyerDevicePortfolioReference (created/activated)
      → BuyerDevicePortfolioSnapshot (immutable; frozen at this moment)
      → BuyerDevicePortfolioChangeRecord (append-only; triggers event)
      → emit device-catalog.my-devices.portfolio-changed
    """
    from .models import (
        Device, BuyerDevicePortfolioReference, BuyerDevicePortfolioSnapshot,
        BuyerDevicePortfolioChangeRecord, ChangeSource, PortfolioChangeType
    )

    # Auth check
    cap = "devices.portfolio.admin_modify" if admin_on_behalf else "devices.portfolio.self_modify"
    result = check_access(user, cap)
    if not result.granted:
        raise PermissionError(f"check_access denied: {result.reason}")

    device = Device.objects.get(id=device_id)

    if not admin_on_behalf:
        is_inactive = device.lifecycle_status == "inactive" and (device.launch_date is None or device.launch_date > timezone.localdate())
        if is_inactive:
            raise ValueError("Inactive devices cannot be added to portfolio.")
        if device.lifecycle_status == "archived":
            raise ValueError("Archived devices cannot be added to portfolio.")
        if device.launch_date and device.launch_date > timezone.localdate():
            raise ValueError("Device is not yet launched and cannot be added to portfolio.")

    company_id = user.entity.company_id
    entity_id = user.entity_id
    change_source = ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION

    with transaction.atomic():
        # The portfolio is company-scoped: any buyer user of the entity may
        # manage the same device list. Match on device + company + entity so a
        # colleague adding an existing device does not create a duplicate entry.
        existing_refs = BuyerDevicePortfolioReference.objects.filter(
            device=device,
            company_scope_reference=company_id,
            buyer_entity_reference=entity_id,
        ).order_by("created_at", "id")

        active_ref = existing_refs.filter(active_flag=True).first()
        if active_ref is not None:
            return {"status": "already_active", "portfolio_reference_id": str(active_ref.id)}

        ref = existing_refs.first()
        if ref is None:
            ref = BuyerDevicePortfolioReference.objects.create(
                device=device,
                buyer_reference=user.id,
                company_scope_reference=company_id,
                buyer_entity_reference=entity_id,
                active_flag=True,
                change_source=change_source,
            )
            created = True
        else:
            ref.active_flag = True
            ref.change_source = change_source
            ref.last_change_timestamp = timezone.now()
            ref.save(update_fields=["active_flag", "change_source", "last_change_timestamp"])
            created = False

        # Create immutable snapshot of the company portfolio
        active_device_ids = get_company_portfolio_device_ids(company_id, entity_id)
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=entity_id,
            device_ids=[str(d) for d in active_device_ids],
            device_count=len(active_device_ids),
            snapshot_reason="device_added",
        )

        # Update reference with snapshot pointer
        BuyerDevicePortfolioReference.objects.filter(id=ref.id).update(
            current_portfolio_snapshot_reference=snapshot.id
        )

        # Append-only change record
        change_record = BuyerDevicePortfolioChangeRecord.objects.create(
            portfolio_reference=ref,
            buyer_reference=user.id,
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
            change_type=PortfolioChangeType.DEVICE_ADDED if created else PortfolioChangeType.DEVICE_REACTIVATED,
            change_source=ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION,
            device=device,
            actor_reference=user.id,
            actor_is_admin_on_behalf=admin_on_behalf,
            resulting_snapshot=snapshot,
        )

        # Emit event for Product Catalog to recalculate Buyer-Scoped Compatibility Projection
        _emit_portfolio_changed_event(user, change_record, snapshot)

        return {
            "status": "added",
            "portfolio_reference_id": str(ref.id),
            "snapshot_id": str(snapshot.id),
            "change_record_id": str(change_record.id),
        }


def remove_device_from_portfolio(user, device_id: UUID, admin_on_behalf: bool = False) -> dict:
    """
    Remove a device from a buyer's My Devices portfolio.

    Architecture rule (locked default from spec.md):
      Removing a device does NOT automatically set Product Catalog Selling Status
      to 'Stop Selling'. Product Catalog owns commercial state transitions.
    """
    from .models import (
        Device, BuyerDevicePortfolioReference, BuyerDevicePortfolioSnapshot,
        BuyerDevicePortfolioChangeRecord, ChangeSource, PortfolioChangeType
    )

    cap = "devices.portfolio.admin_modify" if admin_on_behalf else "devices.portfolio.self_modify"
    result = check_access(user, cap)
    if not result.granted:
        raise PermissionError(f"check_access denied: {result.reason}")

    device = Device.objects.get(id=device_id)

    company_id = user.entity.company_id
    entity_id = user.entity_id
    change_source = ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION

    with transaction.atomic():
        refs = BuyerDevicePortfolioReference.objects.filter(
            device=device,
            company_scope_reference=company_id,
            buyer_entity_reference=entity_id,
        ).order_by("created_at", "id")

        ref = refs.first()
        if ref is None:
            return {"status": "not_in_portfolio"}

        active_refs = list(refs.filter(active_flag=True))
        if not active_refs:
            return {"status": "already_inactive"}

        now = timezone.now()
        BuyerDevicePortfolioReference.objects.filter(
            id__in=[r.id for r in active_refs]
        ).update(
            active_flag=False,
            change_source=change_source,
            last_change_timestamp=now,
        )

        # Create immutable snapshot of the company portfolio
        active_device_ids = get_company_portfolio_device_ids(company_id, entity_id)
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=entity_id,
            device_ids=[str(d) for d in active_device_ids],
            device_count=len(active_device_ids),
            snapshot_reason="device_removed",
        )

        BuyerDevicePortfolioReference.objects.filter(
            id__in=[r.id for r in active_refs]
        ).update(current_portfolio_snapshot_reference=snapshot.id)

        change_record = BuyerDevicePortfolioChangeRecord.objects.create(
            portfolio_reference=ref,
            buyer_reference=user.id,
            company_scope_reference=company_id,
            buyer_entity_reference=entity_id,
            change_type=PortfolioChangeType.DEVICE_REMOVED,
            change_source=change_source,
            device=device,
            actor_reference=user.id,
            actor_is_admin_on_behalf=admin_on_behalf,
            resulting_snapshot=snapshot,
        )

        _emit_portfolio_changed_event(user, change_record, snapshot)

        # NOTE: Do NOT auto-update Product Catalog selling status.
        # Product Catalog consumes the portfolio-changed event and decides independently.

        return {
            "status": "removed",
            "snapshot_id": str(snapshot.id),
            "change_record_id": str(change_record.id),
        }


def _emit_portfolio_changed_event(user, change_record, snapshot):
    """
    Emit device-catalog.my-devices.portfolio-changed event.
    Product Catalog consumes this to recalculate Buyer-Scoped Compatibility Projection.
    """
    # TODO: wire to Celery task / event bus in Phase 3
    logger.info(
        "EVENT: device-catalog.my-devices.portfolio-changed | buyer=%s | change_type=%s | snapshot=%s",
        user.id, change_record.change_type, snapshot.id,
    )
    try:
        from django.contrib.auth import get_user_model
        from apps.catalog.services import recalculate_buyer_compatibility_projection

        company_id = user.entity.company_id
        entity_id = user.entity_id

        # The portfolio is company-scoped, but the projection is keyed by user.
        # Recalculate every buyer user of the entity so colleagues never see a
        # stale (or missing) projection.
        buyer_user_ids = set(
            get_user_model().objects.filter(entity_id=entity_id).values_list("id", flat=True)
        )
        buyer_user_ids.add(user.id)

        for buyer_user_id in buyer_user_ids:
            try:
                recalculate_buyer_compatibility_projection(
                    buyer_reference=buyer_user_id,
                    company_scope_reference=company_id,
                    buyer_entity_reference=entity_id,
                    portfolio_snapshot_reference=snapshot.id,
                    trigger="portfolio_changed",
                )
            except Exception as e:
                logger.error(
                    "Failed to recalculate projection for buyer %s: %s", buyer_user_id, e
                )
    except Exception as e:
        logger.error(f"Failed to recalculate projection on portfolio change: {e}")



def log_device_audit(event_code: str, description: str, device_id, actor_id, status="success"):
    """Log a device-related audit record to the append-only AuditRecord table."""
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        d_id = device_id.id if hasattr(device_id, "id") else device_id
        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        
        company_scope = None
        if a_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=a_id)
                if hasattr(user, "entity") and user.entity and user.entity.company_id:
                    company_scope = user.entity.company_id
            except Exception:
                pass
        
        if not company_scope:
            company_scope = "00000000-0000-0000-0000-000000000000"

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status=status,
            actor_reference=a_id,
            company_scope_reference=company_scope,
            source_module="devices",
            source_record_type="Device",
            source_record_id=d_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as e:
        logger.error(f"Failed to log device audit record for {event_code}: {e}")
