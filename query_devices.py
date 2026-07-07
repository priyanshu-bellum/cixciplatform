import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_local')
django.setup()

from apps.devices.models import Device, Manufacturer

m_apple = Manufacturer.objects.filter(name__iexact="Apple").first()
print("Apple Manufacturer object:", m_apple)
if m_apple:
    print("Is active:", m_apple.is_active)

d1 = Device.objects.filter(manufacturer=m_apple, name__iexact="iPhone 17e").first()
print("Query iPhone 17e:", d1)

d2 = Device.objects.filter(manufacturer=m_apple, name__iexact="iPhone 17 e").first()
print("Query iPhone 17 e:", d2)

d3 = Device.objects.filter(manufacturer=m_apple, name__iexact="iPhone 16e").first()
print("Query iPhone 16e:", d3)

d4 = Device.objects.filter(manufacturer=m_apple, name__iexact="iPhone 16 e").first()
print("Query iPhone 16 e:", d4)

# Print all Apple devices
print("All Apple devices:")
for d in Device.objects.filter(manufacturer=m_apple):
    print(f"- '{d.name}'")
