import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product

products = Product.objects.exclude(media_references=[])
print(f"Found {products.count()} products with non-empty media_references:")
for p in products:
    print(f"ID: {p.id}, Name: {p.name}, Media Refs: {p.media_references}")
