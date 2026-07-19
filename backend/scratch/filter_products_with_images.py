import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset

print("--- Products with images ---")
count = 0
for p in Product.objects.all():
    assets = MediaAsset.objects.filter(owner_record_id=p.id)
    if assets.exists() or p.primary_image_reference or (isinstance(p.media_references, list) and len(p.media_references) > 0):
        count += 1
        print(f"Product ID: {p.id} | Name: {p.name} | SKU: {p.sku}")
        print(f"  primary_image_reference: {p.primary_image_reference}")
        print(f"  media_references (JSON): {p.media_references}")
        print(f"  Linked MediaAssets count: {assets.count()}")
        for asset in assets:
             print(f"    Asset ID: {asset.id} | Status: {asset.status} | Storage Key: {asset.storage_key}")
print(f"Total products with images/references: {count}")
print("--- End ---")
