import openpyxl

wb = openpyxl.load_workbook("../Compatibility Test v4.xlsx")
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
print("Headers count:", len(headers))
print("Headers:", headers)

for r in range(2, min(sheet.max_row + 1, 10)):
    row_vals = [cell.value for cell in sheet[r]]
    row_dict = dict(zip(headers, row_vals))
    print(f"Row {r} SKU={row_dict.get('SKU')}:")
    for k in ["Image URL 1", "Image URL 2", "Image URL 3", "Image URL 4"]:
        if k in row_dict:
            print(f"  {k}: {row_dict[k]}")
