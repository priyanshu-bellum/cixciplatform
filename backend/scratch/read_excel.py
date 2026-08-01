import pandas as pd
excel_path = "../Compatibility Test v7.xlsx"
df = pd.read_excel(excel_path)
for idx, row in df.iterrows():
    print(f"Row {idx+2}: SKU={row.get('SKU')}, Category='{row.get('Product Category')}', Compatibility='{row.get('Device Compatibility')}'")
