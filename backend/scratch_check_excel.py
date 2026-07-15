import openpyxl

wb = openpyxl.load_workbook("C:/Users/dell/Downloads/iPhone 17 Series Test.xlsx", data_only=True)
ws = wb.active

rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
for r_idx, row in enumerate(rows[1:5], start=2):
    print(f"\n--- Row {r_idx} ---")
    for c_idx, val in enumerate(row):
        header = headers[c_idx] if c_idx < len(headers) else f"Col{c_idx}"
        print(f"Col {c_idx} ({header}): {repr(val)}")
