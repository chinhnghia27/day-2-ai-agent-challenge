import sqlite3

conn = sqlite3.connect('brain.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE customers ADD COLUMN email TEXT;")
    conn.commit()
    print("Column 'email' added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column 'email' already exists.")
    else:
        print(f"Error: {e}")

conn.close()
