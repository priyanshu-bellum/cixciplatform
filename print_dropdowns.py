import os
import sys
import django

# Set up django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_local')
django.setup()

from apps.catalog.models import DynamicDropdownConfig

print("--- Dropdown Configs ---")
for d in DynamicDropdownConfig.objects.all():
    print(f"ID: {d.id} | Field: {d.field_name} | Value: {d.value} | Display: {d.display_name}")
print("--- End ---")
