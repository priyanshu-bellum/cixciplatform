import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product

p = Product.objects.filter(sku="CABLE-R-LIGHT-TYPE-C-2569").first()
if p:
    print(f"Product SKU: {p.sku}")
    print(f"  Primary Image Ref: {p.primary_image_reference}")
    print(f"  Media References: {p.media_references}")
else:
    print("Product not found!")
