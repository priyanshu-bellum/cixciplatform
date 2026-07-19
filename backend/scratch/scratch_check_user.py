import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import Company
from django.contrib.auth import get_user_model

co = Company.objects.get(id="7c9f1e4b-1244-4b06-b531-dbebdb75965b")
print("Company name:", co.name)

User = get_user_model()
users = User.objects.filter(entity__company=co)
for u in users:
    print(f"User email: {u.email}, is_vendor: {u.is_vendor}")
