import openpyxl

wb = openpyxl.load_workbook("c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/Compatibility Test v4.xlsx")
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
compat_indices = []
for idx, h in enumerate(headers):
    hl = str(h).lower() if h else ""
    if "compatibility" in hl or "jack" in hl or "charging" in hl or "storage" in hl or "memory" in hl or "watch" in hl or "device" in hl:
        compat_indices.append((idx, h))

print("Compatibility columns found:")
for idx, h in compat_indices:
    print(f"  Col {idx+1}: {h}")

for row_idx in range(2, sheet.max_row + 1):
    vals = [cell.value for cell in sheet[row_idx]]
    sku = vals[5]
    name = vals[1]
    compat_vals = {headers[idx]: vals[idx] for idx, h in compat_indices if idx < len(vals)}
    print(f"Row {row_idx} (SKU: {sku}): {name}")
    for k, v in compat_vals.items():
        if v:
            print(f"  {k}: {v}")
