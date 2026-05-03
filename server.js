require('dotenv').config();
const express = require('express');
const { Resend } = require('resend');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

// --- Admin Authentication Middleware ---
const adminAuth = (req, res, next) => {
    const auth = { 
        login: process.env.ADMIN_USER, 
        password: process.env.ADMIN_PASSWORD 
    };

    if (!auth.login || !auth.password) {
        console.error('CRITICAL: ADMIN_USER or ADMIN_PASSWORD not set in environment.');
        return res.status(500).send('Server configuration error.');
    }

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    res.status(401).send('Authentication required.');
};

// Protect admin.html from direct access
app.get('/admin.html', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serving static files (index.html, main.js, etc.)
app.use((req, res, next) => {
    const forbiddenFiles = ['.env', '.gitignore', 'package.json', 'package-lock.json', 'brain.db', 'ecosystem.config.js', 'resend_config.txt'];
    const pathLower = req.path.toLowerCase();
    
    if (forbiddenFiles.some(file => pathLower.endsWith(file.toLowerCase()))) {
        return res.status(403).send('Forbidden');
    }
    
    if (pathLower === '/admin.html') return; // Handled by the explicit /admin.html route
    next();
});

app.use(express.static(__dirname));

// --- Email Helper ---
async function sendOrderSuccessEmail(customerEmail, customerName) {
    if (!customerEmail) return;
    try {
        const targetEmail = customerEmail.includes('+test') ? customerEmail.replace(/\+test/i, '') : customerEmail;
        
        const { data, error } = await resend.emails.send({
            from: 'CapCut Master <onboarding@resend.dev>',
            to: [targetEmail],
            subject: '🎉 Chào mừng bạn đến với Khóa học CapCut Master!',
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h1 style="color: #ff7d3b;">Chào ${customerName}!</h1>
                    <p>Cảm ơn bạn đã hoàn tất đăng ký khóa học <strong>CapCut Master</strong>.</p>
                    <p>Chúc mừng bạn đã sở hữu lộ trình thực chiến edit video trên điện thoại từ A-Z!</p>
                    <div style="background: #fdf2f2; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">📚 Bước tiếp theo dành cho bạn:</h3>
                        <ol>
                            <li>Tham gia nhóm hỗ trợ Zalo: <a href="#">[Link Nhóm]</a></li>
                            <li>Tải tài liệu Sound Effects & Ebook đính kèm</li>
                            <li>Truy cập bài học đầu tiên tại: <a href="#">[Link Khóa Học]</a></li>
                        </ol>
                    </div>
                    <p>Chúc bạn có những giây phút sáng tạo tuyệt vời!</p>
                    <p><em>Nghĩa Chính Nghĩa</em></p>
                </div>
            `
        });
        
        if (error) {
            console.error('[Resend Error Success Email]:', error);
            return;
        }
        console.log(`Email sent successfully to ${customerEmail}`, data);
    } catch (error) {
        console.error('System Error:', error);
    }
}

function getCustomerByOrderId(orderId) {
    return db.prepare(`
        SELECT c.name, c.email 
        FROM customers c 
        JOIN orders o ON c.id = o.customer_id 
        WHERE o.id = ?
    `).get(orderId);
}

// --- Email Sequence Data ---
const EMAIL_SEQUENCE = [
    {
        index: 1,
        subject: '[Chào mừng] Hành trình sáng tạo Video của bạn bắt đầu từ đây! 🎬',
        html: (name) => `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p>Chào bạn, mình là Nghĩa đây!</p>
                <p>Rất vui vì giữa muôn vàn lựa chọn, bạn đã quyết định dừng chân và đồng hành cùng mình.</p>
                <p>Mình tin rằng ai cũng có một câu chuyện riêng để kể, và video chính là ngôn ngữ tuyệt vời nhất để thực hiện điều đó. Nếu bạn từng thấy các phần mềm edit thật phức tạp và đáng sợ, thì bạn tìm đúng chỗ rồi đấy. Với mình, <strong>"mọi thứ đều có quy trình"</strong> và mình có mặt ở đây để giúp bạn đơn giản hóa mọi rào cản kỹ thuật.</p>
                <p>Hãy kiểm tra hộp thư thường xuyên nhé. Trong 2 ngày tới, mình sẽ chia sẻ một bí mật nhỏ giúp bạn thay đổi hoàn toàn tư duy về edit video.</p>
                <p>Cùng nhau cầu tiến mỗi ngày nhé!</p>
                <p>Thân,<br><strong>Nghĩa.</strong></p>
            </div>
        `
    },
    {
        index: 2,
        subject: 'Bí kíp 80/20: Edit video "xịn" mà không cần phức tạp',
        html: (name) => `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p>Chào bạn, là Nghĩa đây!</p>
                <p>Hôm nay mình muốn chia sẻ với bạn một "insight" mà mình luôn áp dụng: <strong>Nguyên lý 80/20</strong>.</p>
                <p>Nhiều bạn mới tập làm video thường bị "ngộp" bởi hàng tá hiệu ứng, chuyển cảnh lấp lánh và các tính năng nâng cao. Nhưng sự thật là: <strong>80% sức hút của một video đến từ 20% kỹ thuật cốt lõi</strong> — bao gồm tư duy kể chuyện và nhịp cắt (cutting points).</p>
                <p>Thay vì mất hàng giờ để mò mẫm các hiệu ứng phức tạp, hãy tập trung vào việc kể một câu chuyện mượt mà bằng những cú cắt cơ cả nhất. Khi bạn nắm vững "cái lõi", mọi thứ sau đó sẽ trở nên cực kỳ đơn giản.</p>
                <p><strong>Học đi đôi với hành:</strong> Hôm nay, bạn hãy thử quay một clip ngắn 15 giây và chỉ tập trung vào việc cắt bỏ những phần thừa, đảm bảo nhịp điệu trôi chảy. Bạn sẽ thấy sự khác biệt ngay lập tức!</p>
                <p>Thư sau mình sẽ hướng dẫn bạn cách "vận hành" quy trình này một cách chuyên nghiệp nhất. Đón xem nhé!</p>
                <p>Thân,<br><strong>Nghĩa.</strong></p>
            </div>
        `
    },
    {
        index: 3,
        subject: 'Làm chủ CapCut Master - Biến ý tưởng thành video triệu view 🚀',
        html: (name) => `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p>Chào bạn,</p>
                <p>Nếu bạn đã theo dõi đến đây, mình tin rằng bạn đang thực sự nghiêm túc với việc nâng tầm kỹ năng edit video của bản thân.</p>
                <p>Sau rất nhiều trải nghiệm và đúc kết, mình đã đóng gói toàn bộ kiến thức thực chiến vào khóa học: <strong>CapCut Master</strong>. Đây là giải pháp dành cho những ai muốn tạo ra những video chuyên nghiệp, đa phong cách mà không muốn bị lạc trong những thuật ngữ kỹ thuật khô khan.</p>
                <div style="background: #fdf2f2; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>Khóa học này sẽ giúp bạn:</strong></p>
                    <ul>
                        <li>Nắm lòng <strong>quy trình edit tinh gọn</strong>, đi từ ý tưởng đến thành phẩm chỉ trong thời gian ngắn.</li>
                        <li>Thực chiến trên các mẫu video hot trend nhất hiện nay.</li>
                        <li>Xây dựng <strong>tư duy thẩm mỹ</strong> và khả năng kể chuyện bằng hình ảnh lôi cuốn.</li>
                    </ul>
                </div>
                <p><strong>Chi phí đầu tư:</strong> Chỉ <strong>499.000 VNĐ</strong> — một mức giá cực kỳ dễ tiếp cận để bạn sở hữu kỹ năng "hái ra tiền" trong thời đại nội dung số này.</p>
                <p>👉 <a href="http://localhost:3000/#register" style="background: #ff7d3b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Đăng ký và bắt đầu hành trình Master ngay tại đây</a></p>
                <p>Đừng để sự mông lung cản bước bạn. Hãy để mình đồng hành giúp bạn tốt hơn mỗi ngày.</p>
                <p>Hẹn gặp bạn trong khóa học!</p>
                <p>Cầu tiến và không ngừng sáng tạo,<br><strong>Nghĩa.</strong></p>
            </div>
        `
    }
];

// --- Email Sequence Logic ---
async function sendSequenceEmail(email, name, emailIndex) {
    if (!email) return;
    const content = EMAIL_SEQUENCE.find(e => e.index === emailIndex);
    if (!content) return;

    try {
        // Chuẩn hóa email cho Resend (loại bỏ +test nếu có để tránh lỗi 403 ở tài khoản dùng thử)
        const targetEmail = email.includes('+test') ? email.replace(/\+test/i, '') : email;

        const { data, error } = await resend.emails.send({
            from: 'Nghĩa <onboarding@resend.dev>',
            to: [targetEmail],
            subject: content.subject,
            html: content.html(name)
        });

        if (error) {
            console.error(`[Sequence Error] Email ${emailIndex}:`, error);
            return;
        }
        console.log(`[Sequence] Email ${emailIndex} sent to ${email}`, data);
    } catch (error) {
        console.error(`[System Error] Email ${emailIndex}:`, error);
    }
}

function scheduleEmail(customerId, emailIndex, delayDays) {
    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + delayDays);
    db.prepare("INSERT INTO email_jobs (customer_id, email_index, scheduled_time) VALUES (?, ?, ?)").run(
        customerId, emailIndex, scheduledTime.toISOString()
    );
    console.log(`[Sequence] Scheduled Email ${emailIndex} for customer #${customerId} at ${scheduledTime.toISOString()}`);
}

// Background worker to send scheduled emails
setInterval(async () => {
    try {
        const now = new Date().toISOString();
        const jobs = db.prepare(`
            SELECT j.*, c.email, c.name 
            FROM email_jobs j 
            JOIN customers c ON j.customer_id = c.id 
            WHERE j.status = 'pending' AND j.scheduled_time <= ?
        `).all(now);

        for (const job of jobs) {
            await sendSequenceEmail(job.email, job.name, job.email_index);
            db.prepare("UPDATE email_jobs SET status = 'sent' WHERE id = ?").run(job.id);
        }
    } catch (err) {
        console.error('[Background Worker Error]:', err);
    }
}, 60000); // Mỗi phút kiểm tra 1 lần

// Connect DB
const db = new Database(path.join(__dirname, process.env.DB_PATH || 'brain.db'));
db.pragma('journal_mode = WAL');
console.log(`Connected to database at ${process.env.DB_PATH || 'brain.db'}`);

// Phục vụ trang admin
app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Config cho Frontend (Chỉ các giá trị không nhạy cảm)
app.get('/api/config', (req, res) => {
    res.json({
        BANK_ACC: process.env.BANK_ACC,
        BANK_NAME: process.env.BANK_NAME,
        GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL
    });
});

// --------------------------------------------------------
// API Sản phẩm (Products) - PROTECTED (Write)
// --------------------------------------------------------
app.get('/api/products', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM products").all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', adminAuth, (req, res) => {
    try {
        const { name, price, description, stock } = req.body;
        const result = db.prepare("INSERT INTO products (name, price, description, stock) VALUES (?, ?, ?, ?)").run(name, price, description, stock || 0);
        res.json({ id: result.lastInsertRowid, name, price, description, stock });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', adminAuth, (req, res) => {
    try {
        const { name, price, description, stock } = req.body;
        db.prepare("UPDATE products SET name = ?, price = ?, description = ?, stock = ? WHERE id = ?").run(name, price, description, stock, req.params.id);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
    try {
        db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// API Khách hàng (Customers) - PROTECTED
// --------------------------------------------------------
app.get('/api/customers', adminAuth, (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM customers").all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', adminAuth, (req, res) => {
    try {
        const { name, phone, zalo, email } = req.body;
        const result = db.prepare("INSERT INTO customers (name, phone, zalo, email) VALUES (?, ?, ?, ?)").run(name, phone, zalo || phone, email || null);
        res.json({ id: result.lastInsertRowid, name, phone, zalo, email });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/customers/:id', adminAuth, (req, res) => {
    try {
        const { name, phone, zalo, email } = req.body;
        db.prepare("UPDATE customers SET name = ?, phone = ?, zalo = ?, email = ? WHERE id = ?").run(name, phone, zalo, email, req.params.id);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', adminAuth, (req, res) => {
    try {
        db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// API Đơn hàng (Orders) - PROTECTED
// --------------------------------------------------------
app.get('/api/orders', adminAuth, (req, res) => {
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
app.post('/api/orders', adminAuth, (req, res) => {
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

app.put('/api/orders/:id', adminAuth, (req, res) => {
    try {
        const { status } = req.body;
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
        
        // Nếu chuyển sang success -> Gửi email
        if (status === 'success') {
            const customer = getCustomerByOrderId(req.params.id);
            if (customer) sendOrderSuccessEmail(customer.email, customer.name);
        }

        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/orders/:id', adminAuth, (req, res) => {
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
app.post('/api/checkout', async (req, res) => {
    try {
        const { fullname, phone, email } = req.body;

        // Tìm hoặc tạo customer
        let customer = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
        if (!customer) {
            const result = db.prepare("INSERT INTO customers (name, phone, zalo, email) VALUES (?, ?, ?, ?)").run(fullname, phone, phone, email || null);
            customer = { id: result.lastInsertRowid };
        } else {
            // Nếu đã có customer, cập nhật thêm email nếu chưa có
            if (email) {
                db.prepare("UPDATE customers SET email = ? WHERE id = ?").run(email, customer.id);
            }
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

        // --- Xử lý Email Sequence ---
        if (email) {
            if (email.includes('+test')) {
                console.log(`[Test Mode] Sending all 3 emails to ${email} immediately.`);
                await sendSequenceEmail(email, fullname, 1);
                await sendSequenceEmail(email, fullname, 2);
                await sendSequenceEmail(email, fullname, 3);
            } else {
                // Chế độ bình thường
                await sendSequenceEmail(email, fullname, 1); // Gửi Email 1 ngay lập tức
                scheduleEmail(customer.id, 2, 2); // Hẹn Email 2 sau 2 ngày
                scheduleEmail(customer.id, 3, 3); // Hẹn Email 3 sau 3 ngày (tổng cộng)
            }
        }

        res.json({
            success: true,
            orderId: order.lastInsertRowid,
            customerId: customer.id,
            amount: product.price
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bước 2: Khách bấm "Tôi đã chuyển khoản" → chuyển trạng thái sang success
// Lưu ý: API này được gọi từ frontend sau khi khách chuyển khoản xong (nếu poll lỗi hoặc khách muốn chủ động)
app.put('/api/checkout/:id/confirm', (req, res) => {
    try {
        const order = db.prepare("SELECT id, product_id FROM orders WHERE id = ?").get(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.prepare("UPDATE orders SET status = 'success' WHERE id = ?").run(req.params.id);
        // Trừ tồn kho
        db.prepare("UPDATE products SET stock = stock - 1 WHERE id = ?").run(order.product_id);

        // Gửi email thành công
        const customer = getCustomerByOrderId(req.params.id);
        if (customer) sendOrderSuccessEmail(customer.email, customer.name);

        res.json({ success: true, message: 'Payment confirmed and email sent' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// API Polling: Frontend check trạng thái đơn hàng
// --------------------------------------------------------
app.get('/api/checkout/:id/status', (req, res) => {
    try {
        const order = db.prepare("SELECT id, status FROM orders WHERE id = ?").get(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ orderId: order.id, status: order.status });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --------------------------------------------------------
// Sepay Webhook: Nhận thông báo giao dịch từ Sepay
// --------------------------------------------------------
app.post('/api/sepay-webhook', (req, res) => {
    try {
        const { id, transferType, transferAmount, content, code, referenceCode } = req.body;

        console.log(`[Sepay Webhook] Received transaction ID: ${id}, Amount: ${transferAmount}, Content: ${content}`);

        // Chỉ xử lý tiền vào (in)
        if (transferType !== 'in') {
            console.log(`[Sepay Webhook] Ignored non-inbound transaction type: ${transferType}`);
            return res.status(200).json({ success: true });
        }

        // Tìm đơn hàng pending gần nhất
        // Lưu ý: Logic đơn giản này sẽ khớp giao dịch gần nhất với đơn hàng pending gần nhất.
        const pendingOrder = db.prepare(
            "SELECT id, product_id FROM orders WHERE status = 'pending' ORDER BY id DESC LIMIT 1"
        ).get();

        if (pendingOrder) {
            db.prepare("UPDATE orders SET status = 'success' WHERE id = ?").run(pendingOrder.id);
            db.prepare("UPDATE products SET stock = stock - 1 WHERE id = ?").run(pendingOrder.product_id);
            
            // Gửi email thành công cho đơn hàng khớp Webhook
            const customer = getCustomerByOrderId(pendingOrder.id);
            if (customer) sendOrderSuccessEmail(customer.email, customer.name);

            console.log(`[Sepay Webhook] Order #${pendingOrder.id} matches transaction and marked as SUCCESS. Email sent to ${customer?.email}`);
        } else {
            console.log(`[Sepay Webhook] No pending orders found to match this transaction.`);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[Sepay Webhook Error]:', err);
        res.status(200).json({ success: true });
    }
});

// --------------------------------------------------------
// API Survey: Nhận dữ liệu từ Google Form
// --------------------------------------------------------
app.post('/api/survey', (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone is required' });

        // Kiểm tra xem khách đã tồn tại chưa
        const existing = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);

        if (existing) {
            db.prepare("UPDATE customers SET source = 'survey', is_notified = 0 WHERE id = ?").run(existing.id);
            console.log(`[Survey] Updated existing customer: ${phone}`);
        } else {
            db.prepare("INSERT INTO customers (name, phone, email, source, is_notified) VALUES (?, ?, ?, 'survey', 0)").run(
                name || 'Khách khảo sát',
                phone,
                email || null
            );
            console.log(`[Survey] New entry from ${phone}`);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Survey API Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
