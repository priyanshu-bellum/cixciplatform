with open(r'c:\Users\dell\Downloads\cixci-architecture-lab-main\cixci-architecture-lab-main\frontend\src\pages\CatalogPage.tsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'device compatibility' in line.lower():
            print(f"Line {idx}: {line.strip()}")
