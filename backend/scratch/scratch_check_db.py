import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product

skus = [
    "SC-122-XYZ", "ST-401-D456", "ST-401-D789", "AM-4444", 
    "CABLE-R-LIGHT-TYPE-C-2569", "CABLE-R-LIGHT-TYPE-C-59874",
    "CABLE-R-LIGHT-TYPE-C-2589", "CHMAG-15W-3695", "MAG-RING-9586",
    "MAG-RING-JU985", "MAG-RING-GLTTR-DF258", "MAG-RING-GLTTR-DR8547",
    "MAG-RING-2587", "MAG-RING-7HGT8", "MAG-RING-A859D"
]

print("Existing products by SKU:")
for p in Product.objects.filter(sku__in=skus):
    print(f"SKU={p.sku}, Vendor={p.vendor_company_reference}, UPC={p.upc}")
