"""Test which of the 79 unresolved Balaji device names now resolve with fuzzy matching.

Run inside the backend container:
  docker exec cixci_backend_test python /app/test_fuzzy_matching.py
"""
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cixci.settings')
django.setup()

from apps.integration.catalog_compatibility import CatalogDeviceResolver, normalized_name

resolver = CatalogDeviceResolver({})
index = resolver._index()

UNRESOLVED_NAMES = [
    "Galaxy S26 Plus", "Galaxy S26 Plus 5G", "Galaxy S26 Ultra",
    "Galaxy S25 Plus", "Galaxy S25 Ultra", "Galaxy S25",
    "Galaxy S24 Plus", "Galaxy S24 Ultra", "Galaxy S24", "Galaxy S24 FE",
    "Galaxy A57 5G", "Galaxy A37 5G", "Galaxy A27 5G", "Galaxy A17 5G",
    "Galaxy Z Flip 7", "Galaxy Z Fold 7",
    "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Plus", "iPhone 17",
    "iPhone 17 Air", "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus",
    "iPhone 16", "iPhone 16e", "iPhone 15 Pro Max", "iPhone 15 Pro",
    "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro",
    "iPhone 14 Plus", "iPhone 14", "iPhone SE (2025)",
    "moto edge - 2026", "moto edge (2025)", "motorola edge - 2026",
    "motorola edge (2025)", "moto razr (2025)", "moto razr (2024)",
    "moto razr plus (2025)", "moto razr plus (2024)",
    "moto g power - 2025", "moto g power - 2025 / 2026",
    "moto g play - 2026", "moto g play - 2025",
    "moto g - 2025", "moto g stylus - 2025",
    "Pixel 10 Pro", "Pixel 10", "Pixel 10 Pro Fold",
    "Pixel 9a", "Pixel 9 Pro", "Pixel 9 Pro Fold", "Pixel 9",
    "OnePlus 13", "OnePlus Nord N300",
    "TCL 50 XE 5G", "TCL 50 XL 5G NxtPaper",
    "Cricket Debut Flex 2", "Cricket Icon 6",
    "Boost Schok Flip", "Boost Celero 3+",
    "REVVL 7 Pro 5G", "REVVL 7 5G",
    "Universal",
    "Apple Watch Series 10", "Apple Watch Ultra 2", "Apple Watch SE (2024)",
]

print(f'Testing {len(UNRESOLVED_NAMES)} previously unresolved names...\n')

resolved = []
still_unresolved = []

for name in UNRESOLVED_NAMES:
    n = normalized_name(name)
    exact = list(index.get(n, {}).values())
    if exact:
        resolved.append((name, str(exact[0]), 'exact'))
        continue
    fuzzy = resolver._fuzzy_lookup(name)
    if fuzzy:
        resolved.append((name, str(fuzzy[0]), 'fuzzy'))
    else:
        still_unresolved.append(name)

print(f'=== RESOLVED: {len(resolved)} ===')
for name, device, method in resolved:
    print(f'  [{method:5s}] "{name}" -> {device}')

print(f'\n=== STILL UNRESOLVED: {len(still_unresolved)} ===')
for name in still_unresolved:
    print(f'  "{name}"')

print(f'\n=== SUMMARY ===')
print(f'Total tested: {len(UNRESOLVED_NAMES)}')
print(f'Resolved: {len(resolved)} (exact: {sum(1 for _,_,m in resolved if m=="exact")}, fuzzy: {sum(1 for _,_,m in resolved if m=="fuzzy")})')
print(f'Still unresolved: {len(still_unresolved)}')
print(f'\nDevices in index: {len(index)} entries')
