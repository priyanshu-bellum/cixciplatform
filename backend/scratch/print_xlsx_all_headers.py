import openpyxl

wb = openpyxl.load_workbook("c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/Compatibility Test v4.xlsx")
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
print(f"Total columns: {len(headers)}")
for idx, h in enumerate(headers):
    print(f"Col {idx+1}: {h}")
