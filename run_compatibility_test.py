import os
import django
import sys

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

file_path = r"C:\Users\dell\Downloads\Compatibility Test v6.xlsx"
if not os.path.exists(file_path):
    # Try current directory
    file_path = "Compatibility Test v4.xlsx"

print(f"Loading file from: {file_path}")

with open(file_path, "rb") as f:
    file_content = f.read()

uploaded_file = SimpleUploadedFile(
    os.path.basename(file_path),
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
# Print using repr to avoid Decimal JSON serialization error
print("Response data:")
import pprint
pprint.pprint(response.data)
