import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset

print("Products in Database:")
for p in Product.objects.all():
    print(f"ID: {p.id}")
    print(f"Name: {p.name}")
    print(f"SKU: {p.sku}")
    print(f"Primary Image Ref: {p.primary_image_reference}")
    print(f"Media References: {p.media_references}")
    
    # Query linked media assets
    assets = MediaAsset.objects.filter(owner_record_id=p.id)
    print(f"Linked Media Assets: {[str(a.id) for a in assets]}")
    print("-" * 50)
