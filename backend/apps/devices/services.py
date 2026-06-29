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


def add_device_to_portfolio(user, device_id: UUID, admin_on_behalf: bool = False) -> dict:
    """
    Add a device to a buyer's My Devices portfolio.

    State chain:
      BuyerDevicePortfolioReference (created/activated)
      → BuyerDevicePortfolioSnapshot (immutable; frozen at this moment)
      → BuyerDevicePortfolioChangeRecord (append-only; triggers event)
      → emit device-catalog.my-devices.portfolio-changed

    Architecture rule: cross-buyer interference is architecturally impossible —
    all operations are scoped to buyer_reference + company_scope + entity.
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

    with transaction.atomic():
        # Get or create portfolio reference (buyer-scope triad enforced)
        ref, created = BuyerDevicePortfolioReference.objects.get_or_create(
            device=device,
            buyer_reference=user.id,
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
            defaults={
                "active_flag": True,
                "change_source": ChangeSource.BUYER_ACTION,
            }
        )

        if not created and ref.active_flag:
            return {"status": "already_active", "portfolio_reference_id": str(ref.id)}

        if not created:
            ref.active_flag = True
            ref.change_source = ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION
            ref.last_change_timestamp = timezone.now()
            ref.save(update_fields=["active_flag", "change_source", "last_change_timestamp"])

        # Create immutable snapshot
        active_device_ids = list(
            BuyerDevicePortfolioReference.objects.filter(
                buyer_reference=user.id,
                company_scope_reference=user.entity.company_id,
                buyer_entity_reference=user.entity_id,
                active_flag=True,
            ).values_list("device_id", flat=True)
        )
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=user.id,
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
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

    with transaction.atomic():
        try:
            ref = BuyerDevicePortfolioReference.objects.get(
                device=device,
                buyer_reference=user.id,
                company_scope_reference=user.entity.company_id,
                buyer_entity_reference=user.entity_id,
            )
        except BuyerDevicePortfolioReference.DoesNotExist:
            return {"status": "not_in_portfolio"}

        if not ref.active_flag:
            return {"status": "already_inactive"}

        ref.active_flag = False
        ref.change_source = ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION
        ref.last_change_timestamp = timezone.now()
        ref.save(update_fields=["active_flag", "change_source", "last_change_timestamp"])

        active_device_ids = list(
            BuyerDevicePortfolioReference.objects.filter(
                buyer_reference=user.id,
                company_scope_reference=user.entity.company_id,
                buyer_entity_reference=user.entity_id,
                active_flag=True,
            ).values_list("device_id", flat=True)
        )
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=user.id,
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
            device_ids=[str(d) for d in active_device_ids],
            device_count=len(active_device_ids),
            snapshot_reason="device_removed",
        )

        BuyerDevicePortfolioReference.objects.filter(id=ref.id).update(
            current_portfolio_snapshot_reference=snapshot.id
        )

        change_record = BuyerDevicePortfolioChangeRecord.objects.create(
            portfolio_reference=ref,
            buyer_reference=user.id,
            company_scope_reference=user.entity.company_id,
            buyer_entity_reference=user.entity_id,
            change_type=PortfolioChangeType.DEVICE_REMOVED,
            change_source=ChangeSource.ADMIN_ON_BEHALF if admin_on_behalf else ChangeSource.BUYER_ACTION,
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
