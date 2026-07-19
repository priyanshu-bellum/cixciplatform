import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.catalog.api import ProductDetailSerializer
from rest_framework.test import APIRequestFactory
from pprint import pprint

prod = Product.objects.get(sku="CFM-410-FD")

factory = APIRequestFactory()
request = factory.get("/")
request.user = None

serializer = ProductDetailSerializer(instance=prod, context={"request": request})
data = dict(serializer.data)
pprint(data)
