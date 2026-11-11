"""One regional eligibility policy for current buyer reads and future exports.

No customer/DC address fallback, currency conversion, or fee calculation here.
History snapshots are deliberately outside this policy.
"""
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import Company, CompanyEntity, CompanyRelationship


def buyer_region(company_id, entity_id):
    entity = CompanyEntity.objects.select_related("company", "operating_region").filter(
        pk=entity_id, company_id=company_id, status="active", company__status="active",
        company__company_type="buyer",
    ).first()
    if not entity or not entity.operating_region_id or not entity.operating_region.is_active:
        return None
    from .country_regions import normalize_country_code
    code = normalize_country_code(entity.country_code)
    if not code or normalize_country_code(entity.operating_region.code) != code:
        return None
    return entity.operating_region


def effective_regional_fees(vendor_ids, region_code):
    from apps.pricing.models import VendorRegionalShippingFee
    now = timezone.now()
    return VendorRegionalShippingFee.objects.filter(
        vendor_company_reference__in=vendor_ids, region_code=region_code,
        status="active", effective_from__lte=now, fee_amount__gte=0,
    ).exclude(currency="").filter(Q(effective_to__isnull=True) | Q(effective_to__gt=now))


def eligible_vendor_rules(company_id, entity_id):
    region = buyer_region(company_id, entity_id)
    if region is None:
        return None, {}
    # Small commercial configuration sets are decoded once, never per product.
    vendors = {
        record.id: record for record in Company.objects.filter(company_type="vendor", status="active")
        if isinstance(record.approved_regions, list) and region.code in record.approved_regions
    }
    fees = {}
    for vendor_id in effective_regional_fees(vendors, region.code).values_list("vendor_company_reference", flat=True):
        fees[vendor_id] = fees.get(vendor_id, 0) + 1
    # Ambiguous overlapping effective fees require setup; never pick an arbitrary fee.
    rules = {}
    for relationship in CompanyRelationship.objects.filter(
        buyer_company_id=company_id, vendor_company_id__in=vendors, status="active",
    ):
        if fees.get(relationship.vendor_company_id) != 1:
            continue
        if relationship.eligible_regions and region.code not in relationship.eligible_regions:
            continue
        rules.setdefault(relationship.vendor_company_id, []).append(relationship.eligible_product_types or [])
    return region, rules


def filter_buyer_regional_products(queryset, company_id, entity_id):
    if not getattr(settings, "REGIONAL_VISIBILITY_ENFORCE", False):
        # Deployment hold; no tenant-specific exemption or inferred setup.
        buyer = Company.objects.filter(pk=company_id).first()
        if not buyer:
            return queryset.none()
        vendors = Company.objects.filter(company_type="vendor")
        if buyer.approved_regions:
            invisible_ids = [vendor.id for vendor in vendors if vendor.status != "active" or not set(buyer.approved_regions).intersection(vendor.approved_regions or [])]
        else:
            invisible_ids = vendors.exclude(status="active").values_list("id", flat=True)
        return queryset.exclude(vendor_company_reference__in=invisible_ids)
    region, rules = eligible_vendor_rules(company_id, entity_id)
    if region is None or not rules:
        return queryset.none()
    eligible = Q(pk__in=[])
    for vendor_id, product_scopes in rules.items():
        vendor_filter = Q(vendor_company_reference=vendor_id)
        if not any(not scope for scope in product_scopes):
            types = {value for scope in product_scopes for value in scope}
            vendor_filter &= Q(product_type__in=types)
        eligible |= vendor_filter
    return queryset.filter(eligible)


def regional_setup_status(company_id, entity_id, *, resolved=None):
    region, rules = resolved if resolved is not None else eligible_vendor_rules(company_id, entity_id)
    return {
        "enforced": getattr(settings, "REGIONAL_VISIBILITY_ENFORCE", False),
        "status": "ready" if region is not None and rules else "configuration_required",
        "reason": None if region is not None and rules else (
            "buyer_operating_region_required" if region is None else "eligible_vendor_relationship_region_and_fee_required"
        ),
        "operating_region": {"id": str(region.id), "code": region.code, "name": region.name} if region else None,
        "eligible_vendor_count": len(rules),
    }


def invalidate_regional_projections(*, company_id=None, entity_id=None):
    """Mark only current derived data stale; historical exports/orders untouched."""
    from apps.catalog.models import BuyerScopedCompatibilityProjection
    projections = BuyerScopedCompatibilityProjection.objects.all()
    if company_id:
        projections = projections.filter(company_scope_reference=company_id)
    if entity_id:
        projections = projections.filter(buyer_entity_reference=entity_id)
    projections.update(status="review_required", review_required_reason="regional_configuration_changed")
