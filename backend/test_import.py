import os
import django
import sys

# Ensure backend root is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.catalog.api import ProductViewSet
from apps.tenant.models import User

# Find a user to authenticate
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.first()

print("Using user:", user.email if user else "None")

# Load file from parent directory
excel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Rebuild_Accessory_File_Test_File.xlsx")
with open(excel_path, "rb") as f:
    file_content = f.read()

uploaded_file = SimpleUploadedFile(
    "Rebuild_Accessory_File_Test_File.xlsx",
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
if response.status_code >= 400:
    print("Response data error:", response.data)
else:
    print("Response data summary:")
    for k, v in response.data.items():
        if k != "errors":
            print(f"  {k}: {v}")
    errors = response.data.get("errors", [])
    print(f"  Total validation errors: {len(errors)}")
    for e in errors[:10]:
        print("    ", e)
