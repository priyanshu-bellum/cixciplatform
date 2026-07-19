import sqlite3

db_path = r"backend/cixci_local.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, name, manufacturer_id, device_type_id, lifecycle_status, launch_date FROM device_device")
rows = cursor.fetchall()
print("Total devices:", len(rows))
for r in rows:
    name = r[1]
    if "," in name or "+" in name or "Lightning" in name or "Magsafe" in name or "Qi" in name or "Type-C" in name:
        print(r)

conn.close()
