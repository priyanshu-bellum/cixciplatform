"""Create missing devices that Balaji API references but don't exist in catalog.

Run inside the backend container:
  docker exec cixci-local-copy-backend-1 python create_missing_devices.py
  (or on test server: docker exec cixci_backend_test python /app/create_missing_devices.py)
"""
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cixci.settings')
django.setup()

from apps.devices.models import Device, DeviceType, Manufacturer

phone_type = DeviceType.objects.get(code='phone')
smartwatch_type = DeviceType.objects.get(code='smartwatch')

def get_or_create_manufacturer(name):
    mfr, created = Manufacturer.objects.get_or_create(name=name, defaults={'is_active': True})
    if created:
        print(f'  [NEW MFR] {name}')
    return mfr

MISSING_DEVICES = [
    # (manufacturer_name, device_name, device_type)
    # Samsung
    ('Samsung', 'Galaxy S26+ 5G', phone_type),
    ('Samsung', 'Galaxy A27 5G', phone_type),
    ('Samsung', 'Galaxy A17 5G', phone_type),
    # Apple
    ('Apple', 'iPhone 17 Plus', phone_type),
    ('Apple', 'iPhone 17 Air', phone_type),
    ('Apple', 'iPhone SE (2025)', phone_type),
    # Motorola
    ('Motorola', 'moto g play (2025)', phone_type),
    # Google
    ('Google', 'Pixel 9 Pro Fold', phone_type),
    # OnePlus
    ('OnePlus', 'OnePlus 13', phone_type),
    ('OnePlus', 'OnePlus Nord N300', phone_type),
    # TCL
    ('TCL', 'TCL 50 XE 5G', phone_type),
    ('TCL', 'TCL 50 XL 5G NxtPaper', phone_type),
    # Cricket (AT&T brand)
    ('Cricket', 'Cricket Debut Flex 2', phone_type),
    ('Cricket', 'Cricket Icon 6', phone_type),
    # Boost (T-Mobile brand)
    ('Boost', 'Boost Schok Flip', phone_type),
    ('Boost', 'Boost Celero 3+', phone_type),
    # T-Mobile REVVL
    ('T-Mobile', 'REVVL 7 Pro 5G', phone_type),
    ('T-Mobile', 'REVVL 7 5G', phone_type),
    # Apple Watch
    ('Apple', 'Apple Watch Series 10', smartwatch_type),
    ('Apple', 'Apple Watch Ultra 2', smartwatch_type),
    ('Apple', 'Apple Watch SE (2024)', smartwatch_type),
]

created_count = 0
skipped_count = 0

for mfr_name, device_name, device_type in MISSING_DEVICES:
    existing = Device.objects.filter(
        manufacturer__name=mfr_name,
        name=device_name
    ).first()
    if existing:
        print(f'[SKIP] {mfr_name} {device_name} (already exists: {existing.pk})')
        skipped_count += 1
        continue

    mfr = get_or_create_manufacturer(mfr_name)
    device = Device(
        device_type=device_type,
        manufacturer=mfr,
        name=device_name,
        lifecycle_status='available',
    )
    device.save()
    created_count += 1
    print(f'[CREATED] {mfr_name} {device_name} -> {device.pk}')

print(f'\n=== SUMMARY ===')
print(f'Created: {created_count}')
print(f'Skipped: {skipped_count}')
print(f'Total devices in catalog: {Device.objects.count()}')
