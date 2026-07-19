import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset

print("--- Products and their images ---")
for p in Product.objects.all():
    print(f"Product ID: {p.id} | Name: {p.name} | SKU: {p.sku}")
    print(f"  primary_image_reference: {p.primary_image_reference}")
    print(f"  media_references (JSON): {p.media_references}")
    
    # Query linked media assets
    assets = MediaAsset.objects.filter(owner_record_id=p.id)
    print(f"  Linked MediaAssets count: {assets.count()}")
    for asset in assets:
         print(f"    Asset ID: {asset.id} | Status: {asset.status} | Storage Key: {asset.storage_key}")
print("--- End ---")
