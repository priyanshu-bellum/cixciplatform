import os
import django
import sys

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.catalog.api import ProductViewSet
from apps.tenant.models import User

# Find the vendor user to authenticate
user = User.objects.filter(email="vendor@cixci.com").first()
if not user:
    user = User.objects.first()

print("Using user:", user.email if user else "None")

# Load file
with open("Compatibility Test v4.xlsx", "rb") as f:
    file_content = f.read()

uploaded_file = SimpleUploadedFile(
    "Compatibility Test v4.xlsx",
    file_content,
    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

factory = APIRequestFactory()
request = factory.post(
    "/api/catalog/products/bulk_upload/",
    {"file": uploaded_file, "update_mode": "upsert"},
    format="multipart"
)

if user:
    force_authenticate(request, user=user)

view = ProductViewSet.as_view({"post": "bulk_upload"})
response = view(request)

print("Response status:", response.status_code)
import json
print("Response data:")
print(json.dumps(response.data, indent=2))
