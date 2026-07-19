import openpyxl

wb = openpyxl.load_workbook("../Compatibility Test v4.xlsx", data_only=True)
sheet = wb.active
headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]

def normalize_key(k):
    return "".join(c for c in str(k).lower() if c.isalnum())

header_map = {normalize_key(h): i for i, h in enumerate(headers)}
print("Headers mapped:", header_map.keys())

for r_idx in range(2, sheet.max_row + 1):
    row_vals = [cell.value for cell in sheet[r_idx]]
    if not any(row_vals):
        continue
    
    sku = row_vals[header_map.get("sku")]
    category = row_vals[header_map.get("productcategory")]
    compat = row_vals[header_map.get("devicecompatibility")]
    print(f"Row {r_idx}: SKU={sku}, Category={category}, Compat={compat}")
