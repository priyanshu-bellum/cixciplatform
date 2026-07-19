import os
import sys
import django
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.catalog.models import Product
from apps.media.models import MediaAsset
from apps.catalog.api import ProductDetailSerializer
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

# Create a test product
prod = Product.objects.create(
    name="Test Product",
    sku="TEST-SKU-1",
    brand="TestBrand",
    product_type="accessory",
    product_category="Cases",
    vendor_company_reference=uuid.uuid4(),
    company_scope_reference=uuid.uuid4(),
    upc="123456789019",
    launch_date="2026-06-18"
)

# Create two assets
asset_prim = MediaAsset.objects.create(
    id=uuid.uuid4(),
    asset_type="product_image",
    status="ready",
    owner_module="catalog",
    owner_record_id=None,
    company_scope_reference=prod.company_scope_reference,
    original_filename="prim.png",
    file_extension="png",
    mime_type="image/png",
    storage_key="company/product_image/prim.png"
)

asset_ref = MediaAsset.objects.create(
    id=uuid.uuid4(),
    asset_type="product_image",
    status="ready",
    owner_module="catalog",
    owner_record_id=None,
    company_scope_reference=prod.company_scope_reference,
    original_filename="ref.png",
    file_extension="png",
    mime_type="image/png",
    storage_key="company/product_image/ref.png"
)

factory = APIRequestFactory()
request = factory.get("/")
request.user = None

serializer = ProductDetailSerializer(
    instance=prod,
    data={
        "name": "Test Product",
        "sku": "TEST-SKU-1",
        "upc": "123456789019",
        "launch_date": "2026-06-18",
        "primary_image_reference": str(asset_prim.id),
        "media_references": [
            f"http://localhost:8000/media/{asset_ref.storage_key}"
        ]
    },
    partial=True,
    context={"request": request}
)

if serializer.is_valid():
    updated_prod = serializer.save()
    print("Serialized Output after save:")
    import json
    print(json.dumps(serializer.data, indent=2))
else:
    print("Serializer errors:", serializer.errors)
