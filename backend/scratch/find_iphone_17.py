import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.devices.models import Device

devices = Device.objects.filter(name__icontains="iphone 17")
print(f"Found {devices.count()} iPhone 17 devices:")
for d in devices:
    print(f"ID: {d.id}, Name: {d.name}")
