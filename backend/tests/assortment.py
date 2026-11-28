"""Shared test helpers for scenarios that need a product inside a buyer's real assortment.

Exports, storefront listings and buyer product reads are revalidated against the
buyer's entity, portfolio devices, governed category and media readiness. These
helpers build that state through the same records the platform reads.
"""
import uuid
from datetime import date


def buyer_assortment_for(buyer_user):
    """Return ``add(*products)`` that places products in this buyer's compatible assortment."""
    from apps.catalog.models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
    from apps.devices.models import Device, DeviceType, Manufacturer
    from apps.devices.services import add_device_to_portfolio

    kind, _ = DeviceType.objects.update_or_create(code="phone", defaults={"name": "Phone", "status": "active", "is_active": True})
    maker, _ = Manufacturer.objects.get_or_create(name="Assortment Maker")
    device = Device.objects.create(name=f"Assortment Phone {uuid.uuid4().hex[:6]}", manufacturer=maker,
        device_type=kind, lifecycle_status="available", launch_date=date(2024, 1, 1))
    DynamicDropdownConfig.objects.update_or_create(field_name="product_category", value="Assortment Category", defaults={
        "display_name": "Assortment Category", "status": "active", "compatibility_mode": "device_specific",
        "eligible_device_types": ["phone"], "accessory_fields": [], "compatibility_rules": {"_eligible_type_ids": [str(kind.pk)]}})
    add_device_to_portfolio(buyer_user, device.id)

    def add(*products):
        for product in products:
            Product.objects.filter(pk=product.pk).update(product_category="Assortment Category", compatibility_mode="direct_device")
            ProductCompatibilityAssertion.objects.update_or_create(product_id=product.pk, device_reference=device.id, defaults={
                "is_compatible": True, "is_excluded": False, "compatibility_basis": "manual_assertion", "match_status": "Active",
                "match_evidence": {"explicit": {"active": True, "basis": "manual_assertion", "reason": "test assortment"}}})
            Product.objects.filter(pk=product.pk).update(compatibility_status="complete")
            product.refresh_from_db()
        return products

    add.device = device
    return add


def give_ready_image(product):
    """Attach an approved, ready primary image so the product passes the media gate."""
    from apps.catalog.models import Product
    from apps.media.models import MediaAsset
    asset = MediaAsset.objects.create(asset_type="product_image", status="ready", review_status="approved",
        owner_module="catalog", owner_record_id=product.pk, company_scope_reference=product.company_scope_reference,
        original_filename="primary.png", file_extension=".png", mime_type="image/png", has_transparency=True,
        content_hash=uuid.uuid4().hex, storage_key=f"{product.company_scope_reference}/product_image/{uuid.uuid4()}/primary.png")
    Product.objects.filter(pk=product.pk).update(primary_image_reference=asset.pk)
    product.refresh_from_db()
    return asset
