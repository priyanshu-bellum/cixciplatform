import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.devices.models import Device

print("All Samsung devices in DB:")
for dev in Device.objects.filter(name__icontains="Galaxy"):
    print(f"Device: ID={dev.id}, Name='{dev.name}'")
