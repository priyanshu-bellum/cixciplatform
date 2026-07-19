import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product

p = Product.objects.filter(upc="197000076002").first()
if p:
    print(f"Product: ID={p.id}, SKU={p.sku}, Vendor={p.vendor_company_reference}, UPC={p.upc}")
else:
    print("No product with UPC 197000076002")
