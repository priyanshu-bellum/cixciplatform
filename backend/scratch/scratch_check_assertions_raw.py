import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product, ProductCompatibilityAssertion

p = Product.objects.filter(sku="ST-401-D456").first()
if p:
    print(f"Product: {p.sku}")
    assertions = ProductCompatibilityAssertion.objects.filter(product=p)
    for a in assertions:
        print(f"  Assertion ID={a.id}, device_reference='{a.device_reference}'")
else:
    print("Product not found!")
