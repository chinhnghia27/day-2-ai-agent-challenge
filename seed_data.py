import sqlite3
import os

# Load environment variables (optional, manual parse for simple python scripts)
def get_env_db_path():
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.startswith('DB_PATH='):
                    return line.split('=')[1].strip()
    return 'brain.db'

db_path = get_env_db_path()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 1. Them 2 khach hang mau (dung ten that)
    customers = [
        ('Nghiem Chinh Nghia', '0912345678', '0912345678'),
        ('Hoang Thu Ha', '0987654321', '0987654321')
    ]
    
    customer_ids = []
    for c in customers:
        # Kiem tra neu khach hang da ton tai (theo SDT)
        cursor.execute("SELECT id FROM customers WHERE phone = ?", (c[1],))
        existing = cursor.fetchone()
        if not existing:
            cursor.execute("INSERT INTO customers (name, phone, zalo) VALUES (?, ?, ?)", c)
            customer_ids.append(cursor.lastrowid)
        else:
            # Neu ton tai thi update lai ten cho giong ten THAT
            cursor.execute("UPDATE customers SET name = ? WHERE id = ?", (c[0], existing[0]))
            customer_ids.append(existing[0])

    # 2. Lấy ID sản phẩm mẫu (Khóa học CapCut Master)
    cursor.execute("SELECT id, price FROM products WHERE name = 'Khóa học CapCut Master'")
    product = cursor.fetchone()
    
    if product:
        product_id, price = product
        
        # 3. Them 2 don hang mau
        # Don 1: Success - Kiem tra xem da co don success nao cua khach nay chua
        cursor.execute("SELECT id FROM orders WHERE customer_id = ? AND product_id = ? AND status = 'success'", (customer_ids[0], product_id))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)",
                           (customer_ids[0], product_id, price, 'success'))
        
        # Don 2: Pending - Kiem tra xem da co don pending nao cua khach nay chua
        cursor.execute("SELECT id FROM orders WHERE customer_id = ? AND product_id = ? AND status = 'pending'", (customer_ids[1], product_id))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)",
                           (customer_ids[1], product_id, price, 'pending'))
        
        print("Da thiet lap du lieu mau (khong trung lap) thanh cong.")
    else:
        print("Loi: Khong tim thay san pham 'Khoa hoc CapCut Master' de tao don hang mau.")

    conn.commit()
except Exception as e:
    print(f"Loi khi seed data: {e}")
    conn.rollback()
finally:
    conn.close()
