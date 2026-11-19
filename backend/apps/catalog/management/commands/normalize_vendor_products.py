"""Normalize all products for a vendor — color mapping + text cleanup.

Usage:
  # Dry-run (default)
  python manage.py normalize_vendor_products --vendor c3a60798-f51a-4ba4-b2c0-c88e992cbc6c

  # Actually apply changes
  python manage.py normalize_vendor_products --vendor c3a60798-f51a-4ba4-b2c0-c88e992cbc6c --commit
"""
from django.core.management.base import BaseCommand

from apps.catalog.models import Product, VendorColorMapping


# Balaji color map — used to seed VendorColorMapping if entries don't exist
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


class Command(BaseCommand):
    help = "Normalize products for a vendor: create color mappings, fix descriptions/meta/colors."

    def add_arguments(self, parser):
        parser.add_argument("--vendor", type=str, required=True, help="vendor_company_reference UUID")
        parser.add_argument("--commit", action="store_true", help="Actually apply (default: dry-run)")
        parser.add_argument("--skip-colors", action="store_true", help="Skip color mapping creation")

    def handle(self, *args, **options):
        vendor_id = options["vendor"]
        commit = options["commit"]

        from apps.catalog.normalization import normalize_product, resolve_system_colors

        products = list(Product.objects.filter(vendor_company_reference=vendor_id))
        self.stdout.write(f"Found {len(products)} products for vendor {vendor_id}")

        if not products:
            self.stdout.write(self.style.WARNING("No products found."))
            return

        # Step 1: Seed color mappings
        if not options["skip_colors"]:
            created = 0
            for vendor_color, system_color in COLOR_MAP.items():
                _, was_created = VendorColorMapping.objects.get_or_create(
                    vendor_company_reference=vendor_id,
                    vendor_color=vendor_color,
                    defaults={"system_color": system_color, "status": "active"},
                )
                if was_created:
                    created += 1
            self.stdout.write(f"Color mappings: {created} created, {len(COLOR_MAP) - created} already existed")

        # Build lookup
        mappings = {
            m.vendor_color.strip().lower(): m.system_color
            for m in VendorColorMapping.objects.filter(
                vendor_company_reference=vendor_id, status="active"
            )
        }

        # Step 2: Normalize each product
        changes_summary = {"color_mapped": 0, "name_fixed": 0, "desc_fixed": 0,
                           "short_desc_fixed": 0, "meta_title_fixed": 0, "meta_desc_fixed": 0,
                           "total_updated": 0}

        for p in products:
            update_fields = []

            # Color mapping
            if p.color and not p.system_color:
                colors_list, primary, _ = resolve_system_colors(p.color, mappings)
                if primary:
                    p.system_color = primary
                    update_fields.append("system_color")
                    changes_summary["color_mapped"] += 1
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
                changes_summary["name_fixed"] += 1

            new_desc = result.changes.get("description")
            if new_desc is not None and new_desc != (p.description or ""):
                p.description = new_desc
                update_fields.append("description")
                changes_summary["desc_fixed"] += 1

            if p.short_description and p.short_description.startswith("Premium "):
                p.short_description = None
                update_fields.append("short_description")
                changes_summary["short_desc_fixed"] += 1

            new_mt = result.changes.get("meta_title", "")
            if new_mt and new_mt != (p.meta_title or ""):
                p.meta_title = new_mt
                update_fields.append("meta_title")
                changes_summary["meta_title_fixed"] += 1

            new_md = result.changes.get("meta_description", "")
            if new_md and new_md != (p.meta_description or ""):
                p.meta_description = new_md
                update_fields.append("meta_description")
                changes_summary["meta_desc_fixed"] += 1

            if update_fields:
                p.needs_buyer_sync = True
                update_fields.append("needs_buyer_sync")
                changes_summary["total_updated"] += 1
                if commit:
                    Product.objects.filter(pk=p.pk).update(
                        **{f: getattr(p, f) for f in update_fields}
                    )

        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  Colors mapped:        {changes_summary['color_mapped']}")
        self.stdout.write(f"  Names fixed:          {changes_summary['name_fixed']}")
        self.stdout.write(f"  Descriptions fixed:   {changes_summary['desc_fixed']}")
        self.stdout.write(f"  Short desc cleared:   {changes_summary['short_desc_fixed']}")
        self.stdout.write(f"  Meta titles fixed:    {changes_summary['meta_title_fixed']}")
        self.stdout.write(f"  Meta desc fixed:      {changes_summary['meta_desc_fixed']}")
        self.stdout.write(f"  Total products:       {changes_summary['total_updated']}")

        if not commit:
            self.stdout.write(self.style.SUCCESS(
                f"\n[DRY RUN] Would update {changes_summary['total_updated']} products. "
                f"Re-run with --commit to apply."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"\nUpdated {changes_summary['total_updated']} products."
            ))
