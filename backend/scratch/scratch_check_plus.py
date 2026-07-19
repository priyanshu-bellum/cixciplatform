import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.devices.models import Device

print("Plus devices in DB:")
for dev in Device.objects.filter(name__icontains="Plus"):
    print(f"Device: ID={dev.id}, Name='{dev.name}'")

print("S24/S25 devices in DB:")
for dev in Device.objects.filter(name__icontains="S24") | Device.objects.filter(name__icontains="S25"):
    print(f"Device: ID={dev.id}, Name='{dev.name}'")
