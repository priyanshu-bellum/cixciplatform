"""
Product Catalog — Compatibility Projection Service

Implements:
- Workflow 4: recalculate projection on portfolio-changed event
- Workflow 11: empty-portfolio projection (valid — produces empty compatible set)
- Workflow 14: notification intent on projection change
"""
import logging
from uuid import UUID
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def recalculate_buyer_compatibility_projection(
    buyer_reference: UUID,
    company_scope_reference: UUID,
    buyer_entity_reference: UUID,
    portfolio_snapshot_reference: UUID,
    trigger: str = "portfolio_changed",
) -> dict:
    """
    Workflow 4 + 11: Recalculate the Buyer-Scoped Compatibility Projection.

    Architecture rules:
    - Called by the portfolio-changed event consumer
    - Empty portfolio is VALID — produces projection with empty compatible set (status=empty_portfolio)
    - Device Catalog DeviceCapabilityEvidence is consumed read-only here
    - Locked default: does NOT change Product selling_status
    """
    import time
    from .models import (
        Product, ProductCompatibilityAssertion,
        BuyerScopedCompatibilityProjection, ProjectionStatus, ProductStatus
    )
    from apps.devices.models import BuyerDevicePortfolioSnapshot

    start_ms = time.monotonic()

    with transaction.atomic():
        # Get or create the projection record
        projection, _ = BuyerScopedCompatibilityProjection.objects.get_or_create(
            buyer_reference=buyer_reference,
            company_scope_reference=company_scope_reference,
            buyer_entity_reference=buyer_entity_reference,
            defaults={"portfolio_snapshot_reference": portfolio_snapshot_reference},
        )

        # Mark as recalculating
        BuyerScopedCompatibilityProjection.objects.filter(id=projection.id).update(
            status=ProjectionStatus.RECALCULATING,
            portfolio_snapshot_reference=portfolio_snapshot_reference,
        )

        # Load snapshot from Device Catalog (read-only consumption)
        try:
            snapshot = BuyerDevicePortfolioSnapshot.objects.get(id=portfolio_snapshot_reference)
        except BuyerDevicePortfolioSnapshot.DoesNotExist:
            BuyerScopedCompatibilityProjection.objects.filter(id=projection.id).update(
                status=ProjectionStatus.REVIEW_REQUIRED,
                review_required_reason="portfolio_snapshot_not_found",
            )
            return {"status": "review_required", "reason": "snapshot_not_found"}

        device_ids = snapshot.device_ids

        # Filter out inactive, archived, or future launched devices from driving visibility
        if device_ids:
            from apps.devices.models import Device
            from django.db.models import Q
            today_local = timezone.localdate()
            device_ids = list(
                Device.objects.filter(
                    id__in=device_ids,
                    device_type__status='active'
                ).exclude(
                    Q(lifecycle_status="archived") |
                    (Q(lifecycle_status="inactive") & (Q(launch_date__isnull=True) | Q(launch_date__gt=today_local)))
                ).filter(
                    Q(launch_date__isnull=True) | Q(launch_date__lte=today_local)
                ).values_list("id", flat=True)
            )

        # Workflow 11: Empty portfolio is valid
        if not device_ids:
            BuyerScopedCompatibilityProjection.objects.filter(id=projection.id).update(
                status=ProjectionStatus.EMPTY_PORTFOLIO,
                compatible_product_ids=[],
                compatible_product_count=0,
                incompatible_product_ids=[],
                last_recalculated_at=timezone.now(),
                recalculation_trigger=trigger,
                recalculation_duration_ms=int((time.monotonic() - start_ms) * 1000),
            )
            logger.info("Projection Workflow 11: empty portfolio for buyer=%s", buyer_reference)
            return {"status": "empty_portfolio", "compatible_count": 0}

        # Resolve company eligibility
        from apps.tenant.models import Company, CompanyStatus, CompanyType
        try:
            company = Company.objects.get(id=company_scope_reference)
        except Company.DoesNotExist:
            company = None

        import zoneinfo
        est = zoneinfo.ZoneInfo("America/New_York")
        today_est = timezone.now().astimezone(est).date()

        # Build eligible products base queryset (identical to ProductViewSet.get_queryset() for buyers)
        product_qs = Product.objects.filter(
            status=ProductStatus.ACTIVE
        ).exclude(
            compatibility_status="incomplete"
        ).filter(
            Q(release_date__isnull=True) | Q(release_date__lte=today_est)
        )

        if company:
            buyer_regions = company.approved_regions or []
            if not isinstance(buyer_regions, list):
                buyer_regions = [buyer_regions]

            region_filter = Q()
            for r in buyer_regions:
                region_filter |= Q(approved_regions__icontains=f'"{r}"')

            # Find existing vendor companies that are NOT active OR NOT in the buyer's approved regions
            invisible_vendor_ids = Company.objects.filter(
                company_type=CompanyType.VENDOR
            ).exclude(
                Q(status=CompanyStatus.ACTIVE) & region_filter
            ).values_list("id", flat=True)

            product_qs = product_qs.exclude(vendor_company_reference__in=invisible_vendor_ids)

            # MAP Pricing buyer visibility exclusions
            from apps.pricing.models import MapException
            from decimal import Decimal

            enforced_vendor_ids = Company.objects.filter(
                company_type=CompanyType.VENDOR,
                map_pricing_enforced=True
            ).values_list("id", flat=True)

            map_products = Product.objects.filter(
                Q(vendor_company_reference__in=enforced_vendor_ids) | Q(map_price__isnull=False)
            ).filter(status=ProductStatus.ACTIVE)

            approved_exceptions = MapException.objects.filter(
                status="approved",
                start_date__lte=today_est,
                end_date__gte=today_est
            ).filter(
                Q(buyer_company_reference=company.id) | Q(buyer_company_reference__isnull=True)
            )
            except_skus = set(approved_exceptions.values_list("sku", flat=True))

            excluded_product_ids = []
            for p in map_products:
                if p.vendor_company_reference in enforced_vendor_ids and p.map_price is None:
                    excluded_product_ids.append(p.id)
                    continue

                if p.map_price is not None:
                    wholesale = Decimal(str(p.vendor_wholesale_price_amount or "0.00"))
                    msrp_val = Decimal(str(p.msrp or "0.00"))
                    buyer_wholesale_price = wholesale + msrp_val * Decimal("0.14")
                    if buyer_wholesale_price >= p.map_price and p.sku not in except_skus:
                        excluded_product_ids.append(p.id)
                        continue

                    if p.sale_price is not None:
                        buyer_exc = approved_exceptions.filter(sku=p.sku, vendor_company_reference=p.vendor_company_reference).order_by("approved_minimum_price").first()
                        eff_map = buyer_exc.approved_minimum_price if buyer_exc else p.map_price
                        if p.sale_price < eff_map:
                            excluded_product_ids.append(p.id)
                            continue

            if excluded_product_ids:
                product_qs = product_qs.exclude(id__in=excluded_product_ids)

        eligible_product_ids = set(product_qs.values_list("id", flat=True))

        compatible_ids = list(
            ProductCompatibilityAssertion.objects.filter(
                device_reference__in=device_ids,
                is_compatible=True,
                is_excluded=False,
                product_id__in=eligible_product_ids
            ).values_list("product_id", flat=True).distinct()
        )

        incompatible_ids = list(
            ProductCompatibilityAssertion.objects.filter(
                device_reference__in=device_ids,
                is_compatible=False,
                is_excluded=False,
                product_id__in=eligible_product_ids
            ).exclude(product_id__in=compatible_ids)
            .values_list("product_id", flat=True).distinct()
        )

        duration = int((time.monotonic() - start_ms) * 1000)
        prev_count = projection.compatible_product_count

        BuyerScopedCompatibilityProjection.objects.filter(id=projection.id).update(
            status=ProjectionStatus.ACTIVE,
            compatible_product_ids=[str(i) for i in compatible_ids],
            compatible_product_count=len(compatible_ids),
            incompatible_product_ids=[str(i) for i in incompatible_ids],
            last_recalculated_at=timezone.now(),
            recalculation_trigger=trigger,
            recalculation_duration_ms=duration,
            review_required_reason="",
        )

        # Workflow 14: emit notification intent if projection changed
        if len(compatible_ids) != prev_count:
            _emit_projection_changed_notification_intent(
                buyer_reference, company_scope_reference, len(compatible_ids), prev_count
            )

        logger.info(
            "Projection recalculated: buyer=%s compatible=%d duration=%dms",
            buyer_reference, len(compatible_ids), duration,
        )
        return {"status": "active", "compatible_count": len(compatible_ids)}


def _resolve_company_portfolio_snapshot(company_scope_reference, buyer_entity_reference, device_ids, buyer_reference):
    """
    Return a Device Catalog snapshot whose frozen device list matches the
    company's current portfolio, creating one when no match exists.

    Snapshots are immutable, so a new row is created whenever the portfolio
    device set has changed since the last one.
    """
    from apps.devices.models import BuyerDevicePortfolioSnapshot

    wanted = sorted(str(d) for d in device_ids)
    candidates = BuyerDevicePortfolioSnapshot.objects.filter(
        company_scope_reference=company_scope_reference,
    )
    if buyer_entity_reference is not None:
        candidates = candidates.filter(buyer_entity_reference=buyer_entity_reference)

    for snapshot in candidates.order_by("-created_at")[:20]:
        if sorted(str(d) for d in (snapshot.device_ids or [])) == wanted:
            return snapshot

    return BuyerDevicePortfolioSnapshot.objects.create(
        buyer_reference=buyer_reference,
        company_scope_reference=company_scope_reference,
        buyer_entity_reference=buyer_entity_reference,
        device_ids=wanted,
        device_count=len(wanted),
        snapshot_reason="projection_sync",
    )


def ensure_buyer_compatibility_projection(user, trigger="lazy_sync", force=False):
    """
    Return the buyer's compatibility projection, rebuilding it from the current
    company portfolio when it is missing or stale.

    The My Devices portfolio is company-scoped, but projections are keyed by
    user. A buyer who never mutated the portfolio personally (for example a
    colleague added the devices) would otherwise have no projection and see an
    empty "My Compatibility" section.

    Returns None when the buyer has no portfolio devices and no projection.
    """
    from .models import BuyerScopedCompatibilityProjection, ProjectionStatus
    from apps.devices.models import BuyerDevicePortfolioSnapshot
    from apps.devices.services import get_company_portfolio_device_ids

    entity = getattr(user, "entity", None)
    if entity is None:
        return None

    company_id = entity.company_id
    entity_id = entity.id
    device_ids = [str(d) for d in get_company_portfolio_device_ids(company_id, entity_id)]

    projection = BuyerScopedCompatibilityProjection.objects.filter(
        buyer_reference=user.id,
        company_scope_reference=company_id,
        buyer_entity_reference=entity_id,
    ).first()

    if not device_ids and projection is None:
        return None

    if projection is not None and not force:
        snapshot = BuyerDevicePortfolioSnapshot.objects.filter(
            id=projection.portfolio_snapshot_reference
        ).first()
        same_devices = (
            snapshot is not None
            and sorted(str(d) for d in (snapshot.device_ids or [])) == sorted(device_ids)
        )
        if same_devices and projection.status in (
            ProjectionStatus.ACTIVE,
            ProjectionStatus.EMPTY_PORTFOLIO,
        ):
            return projection

    snapshot = _resolve_company_portfolio_snapshot(
        company_id, entity_id, device_ids, buyer_reference=user.id
    )

    recalculate_buyer_compatibility_projection(
        buyer_reference=user.id,
        company_scope_reference=company_id,
        buyer_entity_reference=entity_id,
        portfolio_snapshot_reference=snapshot.id,
        trigger=trigger,
    )

    return BuyerScopedCompatibilityProjection.objects.filter(
        buyer_reference=user.id,
        company_scope_reference=company_id,
        buyer_entity_reference=entity_id,
    ).first()


def _emit_projection_changed_notification_intent(buyer_ref, company_ref, new_count, prev_count):
    """Workflow 14: Notification intent — NPS owns delivery."""
    # TODO: wire to Celery task → NPS NotificationRequest in Phase 4
    logger.info(
        "NOTIFICATION_INTENT: catalog.compatibility-projection.changed | buyer=%s | %d→%d products",
        buyer_ref, prev_count, new_count,
    )


def log_catalog_audit(event_code: str, description: str, product_id, actor_id, status="success"):
    """Log a catalog-related audit record to the append-only AuditRecord table."""
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        p_id = product_id.id if hasattr(product_id, "id") else product_id
        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        
        company_scope = None
        if p_id:
            from apps.catalog.models import Product
            try:
                prod = Product.objects.get(id=p_id)
                company_scope = prod.vendor_company_reference
            except Exception:
                pass

        if not company_scope:
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
            source_module="catalog",
            source_record_type="Product",
            source_record_id=p_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as e:
        logger.error(f"Failed to log catalog audit record for {event_code}: {e}")


def reconcile_product_activation(product, actor_id=None, source="media_upload"):
    """
    Promote a media-staged product to Active once its media is complete.

    Background
    ----------
    A product row that is imported (or edited) without a valid, approved,
    transparent PNG primary image is staged as Inactive so that it can never
    become buyer-facing without media (Rule §1, §22, §31). Once the missing
    media is uploaded, the staging must be cleared, otherwise the product stays
    invisible to buyers forever.

    The promotion re-uses the platform's own activation rules instead of
    inventing new ones:
      - media readiness must pass (Rule §21, §31)
      - the product must not be under an explicit deactivation hold
      - the launch date must have been reached
      - the release date must have been reached

    Price, inventory and device compatibility are NOT checked here: they are
    separate gates (Product.save() automation and the buyer-visibility
    queryset) and must not block the clearing of a media staging.

    Only Inactive products are promoted. Out-of-stock, Draft, Pending Review,
    EOL and Archived products are never touched by this helper.

    Returns a dict: {"activated": bool, "status": str, "reason": str}
    """
    from apps.catalog.models import ProductStatus
    from apps.media.readiness import compute_media_readiness
    import pytz

    result = {
        "activated": False,
        "status": getattr(product, "status", None),
        "reason": None,
        "product_id": str(getattr(product, "id", "")),
    }

    if getattr(product, "status", None) != ProductStatus.INACTIVE:
        result["reason"] = f"status is {getattr(product, 'status', None)}; only Inactive products are reconciled"
        return result

    if getattr(product, "deactivation_reason", None):
        result["reason"] = f"product is on hold ({product.deactivation_reason})"
        return result

    readiness = compute_media_readiness(product)
    if not readiness.is_ready:
        result["reason"] = readiness.reason or "media is not ready"
        return result

    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()

    launch_date = getattr(product, "launch_date", None)
    if launch_date:
        if launch_date.year == 9999:
            result["reason"] = "launch date is a placeholder (9999)"
            return result
        if launch_date > today_est:
            result["reason"] = "launch date has not been reached"
            return result

    release_date = getattr(product, "release_date", None)
    if release_date and release_date > today_est:
        result["reason"] = "release date has not been reached"
        return result

    previous_status = product.status
    product.status = ProductStatus.ACTIVE
    if not getattr(product, "selling_status", None) or product.selling_status == "not_for_sale":
        product.selling_status = "for_sale"

    try:
        product.save(actor_id=actor_id)
    except Exception as exc:
        logger.error("Failed to activate product %s after media upload: %s", product.id, exc)
        result["status"] = previous_status
        result["reason"] = f"save failed: {exc}"
        return result

    product.refresh_from_db()
    result["status"] = product.status
    if product.status != ProductStatus.ACTIVE:
        result["reason"] = (
            f"media is ready but the product stayed {product.status} "
            "(inventory or platform automation applied)"
        )
        return result

    result["activated"] = True
    result["reason"] = "media complete; product activated"

    log_catalog_audit(
        event_code="catalog.product.activated_on_media",
        description=(
            f"Product {product.sku} moved {previous_status} -> {product.status} "
            f"after media upload ({source})."
        ),
        product_id=product.id,
        actor_id=actor_id,
    )

    try:
        from apps.media.services import emit_media_change_events
        emit_media_change_events(
            product.id,
            product.company_scope_reference,
            actor_id=actor_id,
            detail="Product activated after its media became complete.",
        )
    except Exception:
        pass

    return result


def trigger_catalog_recalculation_for_product(product_id):
    """Trigger buyer catalog visibility recalculation for all existing projections."""
    from apps.catalog.models import BuyerScopedCompatibilityProjection
    projections = BuyerScopedCompatibilityProjection.objects.all()
    for proj in projections:
        try:
            recalculate_buyer_compatibility_projection(
                buyer_reference=proj.buyer_reference,
                company_scope_reference=proj.company_scope_reference,
                buyer_entity_reference=proj.buyer_entity_reference,
                portfolio_snapshot_reference=proj.portfolio_snapshot_reference,
                trigger="product_update",
            )
        except Exception as e:
            logger.error(f"Failed to recalculate projection for buyer {proj.buyer_reference}: {e}")


