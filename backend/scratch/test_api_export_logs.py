import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from rest_framework.test import APIClient
from apps.tenant.models import User

# Get the vendor user
user = User.objects.get(email="vendor@cixci.com")

client = APIClient()
client.force_authenticate(user=user)

# Get export logs
print("Calling export-logs list...")
response = client.get("/api/v1/routing/export-logs/", HTTP_HOST="localhost")

print("Status Code:", response.status_code)
if hasattr(response, "data"):
    print("Response Data:", response.data)
else:
    print("Response Content:", response.content)
