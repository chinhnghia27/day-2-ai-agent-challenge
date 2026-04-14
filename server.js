const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Connect DB
const db = new sqlite3.Database(path.join(__dirname, 'brain.db'), (err) => {
    if (err) console.error('Lỗi khi mở database:', err.message);
    else console.log('Đã kết nối brain.db');
});

// Phục vụ trang admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --------------------------------------------------------
// API Sản phầm (Products)
// --------------------------------------------------------
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});
app.post('/api/products', (req, res) => {
    const { name, price, description, stock } = req.body;
    db.run("INSERT INTO products (name, price, description, stock) VALUES (?, ?, ?, ?)", [name, price, description, stock || 0], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, name, price, description, stock });
    });
});
app.put('/api/products/:id', (req, res) => {
    const { name, price, description, stock } = req.body;
    db.run("UPDATE products SET name = ?, price = ?, description = ?, stock = ? WHERE id = ?", [name, price, description, stock, req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Updated" });
    });
});
app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Deleted" });
    });
});

// --------------------------------------------------------
// API Khách hàng (Customers)
// --------------------------------------------------------
app.get('/api/customers', (req, res) => {
    db.all("SELECT * FROM customers", (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});
app.post('/api/customers', (req, res) => {
    const { name, phone, zalo } = req.body;
    db.run("INSERT INTO customers (name, phone, zalo) VALUES (?, ?, ?)", [name, phone, zalo || phone], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, name, phone, zalo });
    });
});
app.put('/api/customers/:id', (req, res) => {
    const { name, phone, zalo } = req.body;
    db.run("UPDATE customers SET name = ?, phone = ?, zalo = ? WHERE id = ?", [name, phone, zalo, req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Updated" });
    });
});
app.delete('/api/customers/:id', (req, res) => {
    db.run("DELETE FROM customers WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Deleted" });
    });
});

// --------------------------------------------------------
// API Đơn hàng (Orders)
// --------------------------------------------------------
app.get('/api/orders', (req, res) => {
    const query = `
        SELECT o.id, o.amount, o.status, o.order_date,
               c.name as customer_name, c.phone as customer_phone,
               p.name as product_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products p ON o.product_id = p.id
    `;
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// Logic: Khi add order mới -> trừ tồn kho của sản phẩm
app.post('/api/orders', (req, res) => {
    const { customer_id, product_id, amount, status } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("INSERT INTO orders (customer_id, product_id, amount, status) VALUES (?, ?, ?, ?)", [customer_id, product_id, amount, status || 'pending'], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({error: err.message});
            }
            const orderId = this.lastID;
            // Tự động trừ số lượng sản phẩm còn lại
            db.run("UPDATE products SET stock = stock - 1 WHERE id = ?", [product_id], function(upErr) {
                if (upErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({error: upErr.message});
                }
                db.run("COMMIT");
                res.json({ id: orderId, message: "Order created and stock reduced" });
            });
        });
    });
});

app.put('/api/orders/:id', (req, res) => {
    const { status } = req.body;
    // Chỉnh sửa nhanh trạng thái
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Updated" });
    });
});

app.delete('/api/orders/:id', (req, res) => {
    // Trả lại tồn kho nếu cần? (Yêu cầu làm đơn giản nên có thể bỏ qua hoặc làm sau)
    db.run("DELETE FROM orders WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: "Deleted" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
