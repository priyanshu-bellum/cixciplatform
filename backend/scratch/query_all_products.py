import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset

print("--- Products in database ---")
for p in Product.objects.all():
    print(f"SKU: {p.sku}")
    print(f"  Name: {p.name}")
    print(f"  Primary Reference: {p.primary_image_reference}")
    print(f"  Media References (raw): {p.media_references}")
    # Let's also query associated MediaAssets
    assets = MediaAsset.objects.filter(owner_record_id=p.id)
    print(f"  Associated MediaAssets count: {assets.count()}")
    for asset in assets:
        print(f"    - Asset ID: {asset.id}, status: {asset.status}, key: {asset.storage_key}")
    print("-" * 40)
