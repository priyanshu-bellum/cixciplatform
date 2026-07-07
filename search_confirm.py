import os

filepath = r'frontend/src/pages/CatalogPage.tsx'
with open(filepath, encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'confirm' in line.lower():
            print(f"{i+1}: {line.strip()}")
