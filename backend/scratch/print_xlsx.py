import openpyxl

wb = openpyxl.load_workbook("c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/Compatibility Test v4.xlsx")
sheet = wb.active

print(f"Sheet Name: {sheet.title}")
print(f"Dimensions: {sheet.dimensions}")

# Read first 10 rows
for row_idx in range(1, 15):
    row_vals = [cell.value for cell in sheet[row_idx]]
    if any(row_vals):
         print(f"Row {row_idx}: {row_vals[:15]}")
