import os

filepath = r'frontend/src/pages/CatalogPage.tsx'
with open(filepath, encoding='utf-8') as f:
    for i, line in enumerate(f):
        for term in ['allowedColors', 'allowedBrands', 'allowedCategories']:
            if term in line:
                print(f"{i+1}: {line.strip()}")
