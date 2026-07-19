import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.catalog.api import ProductViewSet

User = get_user_model()
vendor_user = User.objects.filter(entity__company__id="7c9f1e4b-1244-4b06-b531-dbebdb75965b").first()
if not vendor_user:
    vendor_user = User.objects.filter(is_superuser=True).first()

print("Using user:", vendor_user.email if vendor_user else "None")

factory = RequestFactory()
with open("../Compatibility Test v4.xlsx", "rb") as fp:
    from rest_framework.test import force_authenticate
    request = factory.post("/api/v1/catalog/products/bulk_upload/", {"file": fp, "update_mode": "upsert"})
    request.user = vendor_user
    force_authenticate(request, user=vendor_user)
    
    view = ProductViewSet.as_view({"post": "bulk_upload"})
    response = view(request)
    
    print("Status Code:", response.status_code)
    print("Data:")
    import pprint
    pprint.pprint(response.data)
