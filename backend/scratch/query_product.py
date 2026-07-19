import os
import sys
import django

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
p = Product.objects.filter(sku="MAG-RING-POY").first()
if p:
    print(f"Product Name: {p.name}")
    print(f"Primary Image URL: {p.primary_image_url}")
    print(f"Primary Image Reference: {p.primary_image_reference}")
    print("Media References:")
    for ref in p.media_references.all() if hasattr(p.media_references, 'all') else p.media_references:
        print(f"  - ID: {ref.id if hasattr(ref, 'id') else ref}, URL: {ref.url if hasattr(ref, 'url') else ref}")
else:
    print("Product not found.")
