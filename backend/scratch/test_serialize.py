import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.catalog.api import ProductDetailSerializer

product = Product.objects.get(id="f3fd99c7-0fe4-450a-a3b8-e45dc42d1121")
serializer = ProductDetailSerializer(product)
print("Serialized data:")
print(serializer.data)
