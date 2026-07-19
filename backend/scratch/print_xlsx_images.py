import openpyxl

wb = openpyxl.load_workbook("c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/Compatibility Test v4.xlsx")
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
image_cols = [idx for idx, h in enumerate(headers) if h and "image" in h.lower()]

print("Image columns found:")
for idx in image_cols:
    print(f"  Col {idx+1}: {headers[idx]}")

for row_idx in range(2, sheet.max_row + 1):
    vals = [cell.value for cell in sheet[row_idx]]
    sku = vals[5]
    name = vals[1]
    img_vals = [vals[idx] for idx in image_cols if idx < len(vals) and vals[idx]]
    if img_vals:
        print(f"Row {row_idx} (SKU: {sku}): {name}")
        print(f"  Images: {img_vals}")
