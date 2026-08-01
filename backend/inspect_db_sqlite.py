import sqlite3

conn = sqlite3.connect("backend/cixci_local.db")
cursor = conn.cursor()

def dump_table(table_name):
    try:
        cursor.execute(f"PRAGMA table_info({table_name});")
        cols = [c[1] for c in cursor.fetchall()]
        print(f"\nColumns in {table_name}: {cols}")
        cursor.execute(f"SELECT * FROM {table_name};")
        rows = cursor.fetchall()
        print(f"Rows in {table_name}:")
        for r in rows:
            # Only print relevant columns to avoid password hash length
            d = dict(zip(cols, r))
            clean_d = {k: v for k, v in d.items() if k not in ['password']}
            print(clean_d)
    except Exception as e:
        print(f"Error reading {table_name}:", e)

dump_table("tenant_user")

conn.close()
