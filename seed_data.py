import sqlite3
import os

db_path = 'brain.db'

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
    exit(1)

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
        
        # 3. Thêm 2 đơn hàng mẫu
        # Đơn 1: Success
        cursor.execute("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)",
                       (customer_ids[0], product_id, price, 'success'))
        
        # Đơn 2: Pending
        cursor.execute("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)",
                       (customer_ids[1], product_id, price, 'pending'))
        
        print("Da we thiem 2 khach hang va 2 don hang mau thanh cong.")
    else:
        print("Loi: Khong tim thay san pham 'Khoa hoc CapCut Master' de tao don hang mau.")

    conn.commit()
except Exception as e:
    print(f"Loi khi seed data: {e}")
    conn.rollback()
finally:
    conn.close()
