import os
import sys
import django
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset

try:
    prod = Product.objects.get(id="f3fd99c7-0fe4-450a-a3b8-e45dc42d1121")
    print("Product found:", prod.name)
    print("SKU:", prod.sku)
    print("Primary Image Ref:", prod.primary_image_reference)
    print("Media References:", prod.media_references)
    print("Associated assets in DB:")
    for asset in MediaAsset.objects.filter(owner_record_id=prod.id):
        print(f"  Asset ID: {asset.id}")
        print(f"  Storage Key: {asset.storage_key}")
        print(f"  Status: {asset.status}")
except Exception as e:
    print("Error:", e)
