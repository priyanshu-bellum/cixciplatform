"""
Sample catalog seeding for staging / demo environments.

Why this exists
---------------
Buyers only see Active products whose primary image is an approved,
transparent PNG (Media Validation Rules §21/§31). A fresh import therefore
looks "empty" on the buyer side until media is attached. This module creates a
small, fully valid sample catalog so the buyer Product Catalog and My
Compatibility screens can be tested end-to-end without waiting for a vendor
upload.

Everything here uses the platform's own rules:
  - media readiness is satisfied by a real transparent PNG asset
  - activation goes through ``reconcile_product_activation``
  - compatibility assertions come from ``run_universal_device_type_mapping``
  - price inputs respect the buyer wholesale (VWP + 14% MSRP) / MAP rule
  - creation is audited via ``log_catalog_audit`` / ``log_media_audit``

Seeding only targets a named vendor (default ``testcomm``) and is idempotent.
"""
from __future__ import annotations

import hashlib
import io
from datetime import date, timedelta
from decimal import Decimal

SAMPLE_SKU_PREFIX = "SAMPLE-"

SAMPLE_PRODUCTS = [
    {
        "sku": "SAMPLE-CASE-001",
        "name": "Sample Rugged Clear Case for iPhone",
        "brand": None,
        "category": "Cases",
        "color": "Clear",
        "system_color": "White",
        "vwp": "12.5000",
        "msrp": "34.9900",
        "map": "27.9900",
        "shape": "case",
        "png_color": (37, 99, 235, 255),
        "description": (
            "Sample catalog item: shock-absorbing clear case with reinforced "
            "corners and raised camera lip."
        ),
    },
    {
        "sku": "SAMPLE-CHG-001",
        "name": "Sample Braided USB-C Charging Cable 6ft",
        "brand": None,
        "category": "Chargers and Cables",
        "color": "Gray",
        "system_color": "Silver",
        "vwp": "5.5000",
        "msrp": "19.9900",
        "map": "16.9900",
        "shape": "cable",
        "png_color": (16, 185, 129, 255),
        "description": (
            "Sample catalog item: braided USB-C charging cable with reinforced "
            "collars and fast-charge support."
        ),
    },
    {
        "sku": "SAMPLE-AUD-001",
        "name": "Sample Wireless Earbuds with Charging Case",
        "brand": None,
        "category": "Headphones",
        "color": "Black",
        "system_color": "Black",
        "vwp": "22.0000",
        "msrp": "59.9900",
        "map": "49.9900",
        "shape": "earbuds",
        "png_color": (168, 85, 247, 255),
        "description": (
            "Sample catalog item: true wireless earbuds with touch controls and "
            "a compact charging case."
        ),
    },
    {
        "sku": "SAMPLE-UNI-001",
        "name": "Sample Universal Phone Grip Stand",
        "brand": None,
        "category": "Phone Attachments",
        "color": "Black",
        "system_color": "Black",
        "vwp": "4.0000",
        "msrp": "14.9900",
        "map": "11.9900",
        "shape": "grip",
        "png_color": (245, 158, 11, 255),
        "description": (
            "Sample catalog item: collapsible phone grip that doubles as a "
            "kickstand and fits most cases."
        ),
    },
]


def _png_bytes(shape: str, color) -> bytes:
    """Render a 512x512 transparent PNG with a simple product silhouette."""
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if shape == "case":
        draw.rounded_rectangle([120, 56, 392, 456], radius=56, fill=color)
        draw.rounded_rectangle([176, 120, 336, 260], radius=28, fill=(0, 0, 0, 0))
        draw.ellipse([196, 156, 236, 196], fill=(255, 255, 255, 220))
        draw.ellipse([276, 156, 316, 196], fill=(255, 255, 255, 220))
    elif shape == "cable":
        draw.arc([150, 90, 430, 370], start=200, end=340, fill=color, width=34)
        draw.rounded_rectangle([92, 300, 184, 356], radius=18, fill=color)
        draw.rounded_rectangle([336, 96, 424, 152], radius=18, fill=color)
    elif shape == "earbuds":
        draw.rounded_rectangle([96, 300, 416, 430], radius=48, fill=color)
        draw.ellipse([146, 120, 236, 210], fill=color)
        draw.ellipse([276, 120, 366, 210], fill=color)
        draw.rectangle([182, 196, 200, 320], fill=color)
        draw.rectangle([312, 196, 330, 320], fill=color)
    else:
        draw.ellipse([116, 116, 396, 396], fill=color)
        draw.ellipse([186, 186, 326, 326], fill=(0, 0, 0, 0))
        draw.rounded_rectangle([236, 76, 276, 176], radius=16, fill=color)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _save_png(sku: str, shape: str, color) -> tuple[str, bytes]:
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    data = _png_bytes(shape, color)
    name = default_storage.save(
        f"sample_catalog/{sku.lower()}.png", ContentFile(data)
    )
    return name, data


def _resolve_phone_type_codes() -> list[str]:
    """Discover the device-type codes used by phone-like devices."""
    from django.db.models import Q

    from apps.devices.models import DeviceType

    codes = list(
        DeviceType.objects.filter(status="active")
        .filter(Q(code__icontains="phone") | Q(name__icontains="phone"))
        .values_list("code", flat=True)
        .distinct()
    )
    if not codes:
        codes = list(
            DeviceType.objects.filter(status="active")
            .values_list("code", flat=True)
            .distinct()[:1]
        )
    return [str(c).strip().lower() for c in codes if c]


def _unique_upc(index: int) -> str:
    from apps.catalog.models import Product

    for offset in range(200):
        candidate = f"829{index + offset:09d}"
        if not Product.objects.filter(upc=candidate).exists():
            return candidate
    raise RuntimeError("Could not allocate a unique sample UPC")


def remove_sample_catalog(vendor_name: str = "testcomm") -> dict:
    """Reverse the seed: delete sample products, assertions and media."""
    from apps.catalog.models import Product, ProductCompatibilityAssertion
    from apps.media.models import MediaAsset, MediaAssetVersion
    from apps.tenant.models import Company

    vendor = Company.objects.filter(
        name__iexact=vendor_name, company_type="vendor"
    ).first()
    if not vendor:
        return {"removed": 0, "reason": "vendor_not_found"}

    products = Product.objects.filter(
        vendor_company_reference=vendor.id, sku__startswith=SAMPLE_SKU_PREFIX
    )
    product_ids = list(products.values_list("id", flat=True))
    asset_ids = list(
        MediaAsset.objects.filter(
            owner_module="catalog", owner_record_id__in=product_ids
        ).values_list("id", flat=True)
    )
    ProductCompatibilityAssertion.objects.filter(product_id__in=product_ids).delete()
    products.delete()
    MediaAssetVersion.objects.filter(asset_id__in=asset_ids).delete()
    MediaAsset.objects.filter(id__in=asset_ids).delete()
    return {"removed": len(product_ids)}


def seed_sample_catalog(
    vendor_name: str = "testcomm", dry_run: bool = False
) -> dict:
    """
    Create (idempotently) a small media-complete sample catalog for a vendor.

    Returns a summary dict; never raises for "nothing to do" conditions.
    """
    from django.db import transaction
    from django.utils import timezone

    from apps.catalog.models import Product
    from apps.catalog.compatibility_engine import run_universal_device_type_mapping
    from apps.catalog.services import (
        log_catalog_audit,
        reconcile_product_activation,
        trigger_catalog_recalculation_for_product,
    )
    from apps.media.models import MediaAsset, MediaAssetVersion
    from apps.media.services import log_media_audit
    from apps.tenant.models import Company

    summary = {
        "vendor": None,
        "vendor_name": None,
        "device_type_codes": [],
        "created": [],
        "existing": [],
        "skipped": None,
        "dry_run": dry_run,
    }

    vendor = Company.objects.filter(
        name__iexact=vendor_name, company_type="vendor"
    ).first()
    if not vendor:
        summary["skipped"] = "vendor_not_found"
        return summary
    if vendor.status != "active":
        summary["skipped"] = f"vendor_status_{vendor.status}"
        return summary

    type_codes = _resolve_phone_type_codes()
    summary["vendor"] = str(vendor.id)
    summary["vendor_name"] = vendor.name
    summary["device_type_codes"] = type_codes
    if not type_codes:
        summary["skipped"] = "no_active_device_types"
        return summary

    launch = timezone.localdate() - timedelta(days=30)

    for index, spec in enumerate(SAMPLE_PRODUCTS, start=1):
        sku = spec["sku"]
        existing = Product.objects.filter(
            vendor_company_reference=vendor.id, sku=sku
        ).first()
        if existing:
            summary["existing"].append(sku)
            continue

        if dry_run:
            summary["created"].append(f"{sku} (dry-run)")
            continue

        with transaction.atomic():
            product = Product(
                sku=sku,
                name=spec["name"],
                brand=spec["brand"] or vendor.name,
                product_type="accessory",
                product_category=spec["category"],
                vendor_company_reference=vendor.id,
                company_scope_reference=vendor.id,
                description=spec["description"],
                status="inactive",
                selling_status="not_for_sale",
                vendor_wholesale_price_amount=Decimal(spec["vwp"]),
                msrp=Decimal(spec["msrp"]),
                map_price=Decimal(spec["map"]),
                upc=_unique_upc(index),
                launch_date=launch,
                color=spec["color"],
                system_color=spec["system_color"],
                inventory_level=250,
                length=Decimal("6.500"),
                width=Decimal("3.200"),
                height=Decimal("1.100"),
                weight=Decimal("0.200"),
                warranty="1 Year",
                compatibility_mode="universal_device_type",
                compatible_device_types=type_codes,
            )
            product.save()

            storage_key, data = _save_png(sku, spec["shape"], spec["png_color"])
            asset = MediaAsset.objects.create(
                asset_type="product_image",
                status="ready",
                review_status="approved",
                reviewed_at=timezone.now(),
                owner_module="catalog",
                owner_record_id=product.id,
                company_scope_reference=vendor.id,
                original_filename=f"{sku.lower()}.png",
                file_extension=".png",
                mime_type="image/png",
                file_size_bytes=len(data),
                width=512,
                height=512,
                has_transparency=True,
                alt_text=spec["name"],
                storage_key=storage_key,
                content_hash=hashlib.sha256(data).hexdigest(),
                is_public=True,
            )
            MediaAssetVersion.objects.create(
                asset=asset,
                version_number=1,
                is_current=True,
                storage_key=storage_key,
                content_hash=asset.content_hash,
                file_size_bytes=len(data),
            )

            product.primary_image_reference = asset.id
            product.media_references = [str(asset.id)]
            product.save()

            activation = reconcile_product_activation(
                product, actor_id=None, source="sample_seed"
            )

            run_universal_device_type_mapping(
                product, actor_id=None, change_source="Sample catalog seed"
            )

            log_catalog_audit(
                event_code="catalog.product.sample_seeded",
                description=(
                    f"Sample catalog product {sku} seeded for {vendor.name} "
                    f"(status={product.status}, activation={activation.get('reason')})."
                ),
                product_id=product.id,
                actor_id=None,
            )
            log_media_audit(
                event_code="media.asset.sample_seeded",
                description=f"Sample transparent PNG {storage_key} attached to {sku}.",
                asset_id=asset.id,
                company_id=vendor.id,
                actor_id=None,
            )

        summary["created"].append(sku)

    if not dry_run:
        seeded = Product.objects.filter(
            vendor_company_reference=vendor.id,
            sku__in=[s["sku"] for s in SAMPLE_PRODUCTS],
        ).values_list("id", flat=True)
        for product_id in seeded:
            trigger_catalog_recalculation_for_product(product_id)

    return summary
