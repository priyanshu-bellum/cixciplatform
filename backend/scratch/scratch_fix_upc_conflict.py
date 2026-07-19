import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product

p = Product.objects.filter(upc="197000076002").first()
if p:
    print(f"Updating UPC of {p.sku} from 197000076002 to 197000076009")
    p.upc = "197000076009"
    p.save()
else:
    print("No conflicting product found.")
