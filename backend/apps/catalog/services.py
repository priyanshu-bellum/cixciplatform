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


