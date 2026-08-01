import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from rest_framework.test import APIClient
from apps.tenant.models import Company, User, Capability

vendor = Company.objects.filter(company_type="vendor").first()
print("Vendor Company ID:", vendor.id)

# Authenticate as superuser to assign capability
admin_user = User.objects.filter(is_superuser=True, is_active=True).first()

client = APIClient()
client.force_authenticate(user=admin_user)

response = client.post(f"/api/v1/tenant/companies/{vendor.id}/assign_capability/", {
    "capability_code": "routing.export.list"
}, format="json", HTTP_HOST="localhost")

print("Status Code:", response.status_code)
if hasattr(response, "data"):
    print("Response Data:", response.data)
else:
    print("Response Content:", response.content)
