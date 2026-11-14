"""Current supplier-source holds affect future Buyer reads, never history."""
from django.db.models import Exists, OuterRef, Q


def eligible_vendor_sources(queryset):
    from .models import VendorBrandRelationship
    approved = VendorBrandRelationship.objects.filter(
        vendor_company_id=OuterRef('vendor_company_reference'),
        brand_id=OuterRef('brand_reference_id'), is_active=True, brand__is_active=True)
    # Existing migrated/manual offers retain their established commercial gates.
    # API-managed offers additionally require their current approved supplier
    # relationship; retiring it cannot leave a stale positive Buyer projection.
    return queryset.alias(_source_brand_approved=Exists(approved)).exclude(
        Q(vendor_catalog_source__review_required=True) | Q(vendor_catalog_source__is_listed=False)
        | Q(vendor_catalog_source__isnull=False, _source_brand_approved=False))
