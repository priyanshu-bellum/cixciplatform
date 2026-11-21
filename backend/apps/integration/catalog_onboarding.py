"""Explicitly authorized onboarding policy shared by catalog entry points."""
from django.db import transaction

from apps.tenant.models import Company
from apps.catalog.models import Brand, VendorBrandRelationship


@transaction.atomic
def activate_catalog_vendor(connection, actor, *, statuses):
    vendor = Company.objects.select_for_update().get(pk=connection.vendor_company_id)
    if vendor.status not in statuses:
        return False
    previous = vendor.status
    vendor.status = 'active'
    vendor.save(update_fields=['status'])
    from .catalog_sync import audit
    audit('vendor_auto_activated', connection, actor, before=previous, after='active')
    connection.vendor_company = vendor
    return True


def resolve_import_brand(connection, name, actor):
    """Create a missing distributor link, preserving explicit inactive decisions."""
    if not isinstance(name, str):
        return None
    label = ' '.join(name.split())
    if not label or len(label) > 200:
        return None
    brand, created_brand = Brand.objects.get_or_create(
        canonical_key=label.casefold(), defaults={'name': label, 'is_active': True})
    if not brand.is_active:
        return None
    relationship, created_link = VendorBrandRelationship.objects.get_or_create(
        vendor_company_id=connection.vendor_company_id, brand=brand,
        defaults={'is_active': True, 'relationship_type': 'authorized_distributor', 'approved_by': actor})
    if not relationship.is_active:
        return None
    if created_brand or created_link:
        from .catalog_sync import audit
        audit('brand_auto_linked', connection, actor, brand_id=brand.pk,
            relationship_id=relationship.pk, relationship_type=relationship.relationship_type,
            created_brand=created_brand, created_relationship=created_link)
    return brand
