import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.test_settings")

import django
django.setup()

from rest_framework.test import APIClient
from apps.tenant.models import User, Company
from apps.fulfillment.models import VendorShippingImportLog

user = User.objects.filter(email__icontains="admin").first() or User.objects.first()
client = APIClient()
client.force_authenticate(user=user)

res = client.get("/api/v1/fulfillment/shipping-import-logs/")
print("Status Code:", res.status_code)
if res.status_code == 200:
    print("Log Count:", len(res.data) if isinstance(res.data, list) else len(res.data.get("results", [])))
    print("Data:", res.data)
else:
    print("Error:", res.content)

print("DB VendorShippingImportLog count:", VendorShippingImportLog.objects.count())
