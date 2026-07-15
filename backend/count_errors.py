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

user = User.objects.filter(email="vendor@cixci.com").first()

print("Using user:", user.email if user else "None")

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

errors = response.data.get("errors", [])
print("Total rows:", response.data.get("total_rows_processed"))
print("Rows passed:", response.data.get("rows_passed"))
print("Rows staged:", response.data.get("rows_staged"))
print("Rows failed:", response.data.get("rows_failed"))
print("Total errors:", len(errors))

by_column = {}
for e in errors:
    col = e.get("column_name")
    err = e.get("validation_error")
    by_column.setdefault(col, []).append(err)

for col, errs in by_column.items():
    print(f"\nColumn: {col} (Count: {len(errs)})")
    unique = {}
    for err in errs:
        unique[err] = unique.get(err, 0) + 1
    for err, count in unique.items():
        print(f"  - {err} (occurred {count} times)")
