import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_local')
django.setup()

from apps.devices.models import Device

print("--- Devices ---")
for d in Device.objects.all():
    print(f"ID: {d.id} | Manufacturer: {d.manufacturer.name if d.manufacturer else None} | Name: {d.name}")
print("--- End ---")
