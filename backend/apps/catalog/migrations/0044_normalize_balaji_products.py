"""Data migration: normalize Balaji Wireless products.

Creates VendorColorMapping entries for all 86 known Balaji vendor colors,
applies system_color to products, and re-runs normalization to fix:
- Warranty line removal from descriptions (vendor-channel content §8)
- Short description cleanup (remove auto-generated "Premium..." text)
- Meta title cleanup (remove "| CIXCI", fix duplicate brand)
- Meta description cleanup (remove "Purchase the high-quality..." garbage)
"""
from django.db import migrations


BALAJI_VENDOR_ID = "6360b2ba-7606-4946-8f51-3ea3975a7d20"

COLOR_MAP = {
    "Amethyst": "Purple", "Aqua Pink": "Pink", "Arctic Bloom": "White",
    "Beige": "Brown", "Black": "Black", "Black & Black": "Black",
    "Black & Red": "Multi-Color", "Blossom": "Pink", "Blue": "Blue",
    "Blue & Black": "Multi-Color", "Blue Camouflage": "Blue",
    "Blush Pink": "Pink", "Burgundy": "Red", "Carbon": "Black",
    "Champagne": "Gold", "Charcoal": "Black", "Clear": "Clear",
    "Clear & Black": "Multi-Color", "Clear Blue": "Blue",
    "Clear Frost": "Clear", "Clear Gray": "Silver",
    "Clear Lilac": "Purple", "Clear MagSafe": "Clear",
    "Clear Purple": "Purple", "Cobalt Blue": "Blue",
    "Confetti": "Multi-Color", "Crimson": "Red", "Dark Blue": "Blue",
    "Dark Green": "Green", "Flamingo": "Pink", "Forest Green": "Green",
    "Frost": "Clear", "Frost Black": "Black", "Frost Blue": "Blue",
    "Frost Gray": "Silver", "Frost Taupe": "Brown", "Gold": "Gold",
    "Green": "Green", "Green Blue": "Multi-Color",
    "Gun Metal Gray & Black": "Multi-Color", "Gunmetal Gray": "Silver",
    "Hunter Green": "Green", "Iridescent": "Multi-Color",
    "Leaves": "Green", "Lilac": "Purple", "Magnetic Black": "Black",
    "Marble": "White", "Marine Blue": "Blue", "Midnight": "Black",
    "Midnight Blue": "Blue", "Mint": "Green", "Navy Blue": "Blue",
    "Neutral Taupe": "Brown", "Nightfall Blue": "Blue",
    "Opal": "Multi-Color", "Orange": "Orange", "Pacific Blue": "Blue",
    "Pastel Blue": "Blue", "Peri": "Purple", "Pink": "Pink",
    "Pink & Purple": "Multi-Color", "Plum": "Purple",
    "Prism": "Multi-Color", "Privacy": "Black", "Purple": "Purple",
    "Rainbow Swirl": "Multi-Color", "Red": "Red",
    "Red & Black": "Multi-Color", "Rose Gold": "Gold",
    "Rose Opalite": "Pink", "Shadow Mauve": "Purple", "Silver": "Silver",
    "Silver Fringe": "Silver", "Smoke": "Silver", "Space Blue": "Blue",
    "Starburst": "Multi-Color", "Steel Blue": "Blue",
    "Stellar": "Multi-Color", "Titanium": "Silver",
    "Topography": "Multi-Color", "Ultra Violet": "Purple",
    "Violet": "Purple", "Wanderlust": "Multi-Color", "White": "White",
    "White & Pink": "Multi-Color", "Yellow & Pink": "Multi-Color",
}


def apply_normalization(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    VendorColorMapping = apps.get_model("catalog", "VendorColorMapping")

    # Create color mappings
    for vendor_color, system_color in COLOR_MAP.items():
        VendorColorMapping.objects.get_or_create(
            vendor_company_reference=BALAJI_VENDOR_ID,
            vendor_color=vendor_color,
            defaults={"system_color": system_color, "status": "active"},
        )

    # Build lookup
    mappings = {
        m.vendor_color.strip().lower(): m.system_color
        for m in VendorColorMapping.objects.filter(
            vendor_company_reference=BALAJI_VENDOR_ID, status="active"
        )
    }

    from apps.catalog.normalization import (
        normalize_product, resolve_system_colors,
    )

    for p in Product.objects.filter(vendor_company_reference=BALAJI_VENDOR_ID):
        update_fields = []

        # Color mapping
        if p.color and not p.system_color:
            colors_list, primary, _ = resolve_system_colors(p.color, mappings)
            if primary:
                p.system_color = primary
                update_fields.append("system_color")
            if colors_list:
                p.system_colors = colors_list
                update_fields.append("system_colors")

        # Normalization
        result = normalize_product(
            name=p.name or "",
            brand=p.brand or "",
            category=p.product_category or "",
            color=p.color or "",
            short_description=p.short_description,
            description=p.description,
            meta_title=p.meta_title,
            meta_description=p.meta_description,
        )

        new_name = result.changes.get("name")
        if new_name and new_name != p.name:
            p.name = new_name
            update_fields.append("name")

        new_desc = result.changes.get("description")
        if new_desc is not None and new_desc != (p.description or ""):
            p.description = new_desc
            update_fields.append("description")

        if p.short_description and p.short_description.startswith("Premium "):
            p.short_description = None
            update_fields.append("short_description")

        new_mt = result.changes.get("meta_title", "")
        if new_mt and new_mt != (p.meta_title or ""):
            p.meta_title = new_mt
            update_fields.append("meta_title")

        new_md = result.changes.get("meta_description", "")
        if new_md and new_md != (p.meta_description or ""):
            p.meta_description = new_md
            update_fields.append("meta_description")

        if update_fields:
            p.needs_buyer_sync = True
            update_fields.append("needs_buyer_sync")
            Product.objects.filter(pk=p.pk).update(
                **{f: getattr(p, f) for f in update_fields}
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0043_product_needs_buyer_sync"),
    ]

    operations = [
        migrations.RunPython(apply_normalization, noop),
    ]
