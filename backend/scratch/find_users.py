import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import Company, CompanyEntity, User

print("COMPANIES:")
for c in Company.objects.all():
    print(f"Company ID: {c.id}, Name: {c.name}, Type: {c.company_type}")

print("\nUSERS:")
for u in User.objects.all():
    co_name = u.entity.company.name if u.entity and u.entity.company else "None"
    print(f"Email: {u.email}, Company: {co_name}, is_active: {u.is_active}")
