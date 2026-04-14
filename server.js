const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Connect DB
const db = new Database(path.join(__dirname, 'brain.db'));
db.pragma('journal_mode = WAL');
console.log('Connected to brain.db');

// Phục vụ trang admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --------------------------------------------------------
// API Sản phẩm (Products)
// --------------------------------------------------------
app.get('/api/products', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM products").all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', (req, res) => {
    try {
        const { name, price, description, stock } = req.body;
        const result = db.prepare("INSERT INTO products (name, price, description, stock) VALUES (?, ?, ?, ?)").run(name, price, description, stock || 0);
        res.json({ id: result.lastInsertRowid, name, price, description, stock });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', (req, res) => {
    try {
        const { name, price, description, stock } = req.body;
        db.prepare("UPDATE products SET name = ?, price = ?, description = ?, stock = ? WHERE id = ?").run(name, price, description, stock, req.params.id);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// API Khách hàng (Customers)
// --------------------------------------------------------
app.get('/api/customers', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM customers").all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', (req, res) => {
    try {
        const { name, phone, zalo } = req.body;
        const result = db.prepare("INSERT INTO customers (name, phone, zalo) VALUES (?, ?, ?)").run(name, phone, zalo || phone);
        res.json({ id: result.lastInsertRowid, name, phone, zalo });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/customers/:id', (req, res) => {
    try {
        const { name, phone, zalo } = req.body;
        db.prepare("UPDATE customers SET name = ?, phone = ?, zalo = ? WHERE id = ?").run(name, phone, zalo, req.params.id);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// API Đơn hàng (Orders)
// --------------------------------------------------------
app.get('/api/orders', (req, res) => {
    try {
        const query = `
            SELECT o.id, o.amount, o.status, o.order_date,
                   c.name as customer_name, c.phone as customer_phone,
                   p.name as product_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN products p ON o.product_id = p.id
        `;
        const rows = db.prepare(query).all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Logic: Khi add order mới -> trừ tồn kho của sản phẩm
app.post('/api/orders', (req, res) => {
    try {
        const { customer_id, product_id, amount, status } = req.body;
        const insertOrder = db.prepare("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)");
        const reduceStock = db.prepare("UPDATE products SET stock = stock - 1 WHERE id = ?");

        const transaction = db.transaction(() => {
            const result = insertOrder.run(customer_id, product_id, amount, status || 'pending');
            reduceStock.run(product_id);
            return result.lastInsertRowid;
        });

        const orderId = transaction();
        res.json({ id: orderId, message: "Order created and stock reduced" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id', (req, res) => {
    try {
        const { status } = req.body;
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// Seed sản phẩm mặc định (Khóa học CapCut)
// --------------------------------------------------------
const existingProduct = db.prepare("SELECT id FROM products WHERE name = ?").get('Khóa học CapCut Master');
if (!existingProduct) {
    db.prepare("INSERT INTO products (name, price, description, stock) VALUES (?, ?, ?, ?)").run(
        'Khóa học CapCut Master', 499000, 'Thực chiến Edit Video đa phong cách cùng CapCut', 100
    );
    console.log('Seeded default product: Khóa học CapCut Master');
}

// --------------------------------------------------------
// API Checkout (Frontend gọi khi khách đặt hàng)
// --------------------------------------------------------

// Bước 1: Khách submit form → tạo customer + đơn hàng pending
app.post('/api/checkout', (req, res) => {
    try {
        const { fullname, phone, email } = req.body;

        // Tìm hoặc tạo customer
        let customer = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
        if (!customer) {
            const result = db.prepare("INSERT INTO customers (name, phone, zalo) VALUES (?, ?, ?)").run(fullname, phone, phone);
            customer = { id: result.lastInsertRowid };
        }

        // Lấy sản phẩm mặc định (CapCut)
        const product = db.prepare("SELECT id, price FROM products LIMIT 1").get();
        if (!product) {
            return res.status(400).json({ error: 'No product found' });
        }

        // Tạo đơn hàng pending
        const order = db.prepare("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, 'pending')").run(
            customer.id, product.id, product.price
        );

        res.json({
            success: true,
            orderId: order.lastInsertRowid,
            customerId: customer.id,
            amount: product.price
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bước 2: Khách bấm "Tôi đã chuyển khoản" → chuyển trạng thái sang success
app.put('/api/checkout/:id/confirm', (req, res) => {
    try {
        const order = db.prepare("SELECT id, product_id FROM orders WHERE id = ?").get(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.prepare("UPDATE orders SET status = 'success' WHERE id = ?").run(req.params.id);
        // Trừ tồn kho
        db.prepare("UPDATE products SET stock = stock - 1 WHERE id = ?").run(order.product_id);

        res.json({ success: true, message: 'Payment confirmed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
