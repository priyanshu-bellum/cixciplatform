import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tenant.models import User, Company

print("=== Users ===")
for u in User.objects.all():
    print(f"Email: {u.email}, Active: {u.is_active}, Admin: {u.is_cixci_admin}, Company: {u.company}")

print("\n=== Companies ===")
for c in Company.objects.all():
    print(f"Name: {c.name}, ID: {c.id}, Type: {c.company_type}")
