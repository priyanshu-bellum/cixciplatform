"""Correct Vendor Wholesale Price for products overwritten by the frontend
19.99 fallback bug, using the authoritative values from the client Excel
"iPhone 18 accessories test run v2.xlsx".

Only products listed below are touched; each value is the exact
"Vendor Wholesale Price" column value from the source spreadsheet. Buyer
wholesale price is a computed property, so it updates automatically.
"""
from decimal import Decimal

from django.db import migrations


# SKU -> correct Vendor Wholesale Price (from the source Excel).
PRICE_CORRECTIONS = {
    "PC-301": Decimal("3.15"),
}


def fix_vendor_prices(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    for sku, correct_price in PRICE_CORRECTIONS.items():
        Product.objects.filter(sku=sku).update(
            vendor_wholesale_price_amount=correct_price
        )


def revert_vendor_prices(apps, schema_editor):
    # No safe automatic rollback: the pre-fix value (the bogus 19.99) is not
    # authoritative. This migration is a forward-only data correction.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0019_buyerproductexportjob_include_media_missing"),
    ]

    operations = [
        migrations.RunPython(fix_vendor_prices, revert_vendor_prices),
    ]
