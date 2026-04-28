const express = require("express");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Khởi tạo Database
const dbPath = path.join(__dirname, "brain.db");
const db = new Database(dbPath);

// --- Định nghĩa logic của các Tools ---

const getDailySummary = () => {
    const today = new Date().toISOString().split("T")[0];
    const dateQuery = `${today}%`;

    const leadCount = db.prepare("SELECT COUNT(*) as count FROM customers WHERE registration_date LIKE ?").get(dateQuery).count;
    const orderStats = db.prepare("SELECT COUNT(*) as count, SUM(amount) as revenue FROM orders WHERE status = 'success' AND order_date LIKE ?").get(dateQuery);
    const pendingOrders = db.prepare(`
        SELECT o.id, c.name, c.phone 
        FROM orders o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.status = 'pending' 
        ORDER BY o.id DESC LIMIT 5
    `).all();

    let report = `📊 **BÁO CÁO NGÀY ${today}**\n\n`;
    report += `👤 Lead mới: ${leadCount}\n`;
    report += `✅ Đơn thành công: ${orderStats.count}\n`;
    report += `💰 Doanh thu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderStats.revenue || 0)}\n\n`;

    if (pendingOrders.length > 0) {
        report += `⏳ **Đơn hàng chờ xử lý mới nhất:**\n`;
        pendingOrders.forEach(o => {
            report += `- ID #${o.id}: ${o.name} (${o.phone})\n`;
        });
    } else {
        report += `✨ Không có đơn hàng pending nào.`;
    }
    return report;
};

const findCustomerInfo = (query) => {
    const searchTerm = `%${query}%`;
    const customers = db.prepare("SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ?").all(searchTerm, searchTerm);

    if (customers.length === 0) return "❌ Không tìm thấy khách hàng nào khớp với yêu cầu.";

    let result = `🔍 Tìm thấy ${customers.length} khách hàng:\n\n`;
    customers.forEach(c => {
        const orders = db.prepare("SELECT id, amount, status, order_date FROM orders WHERE customer_id = ?").all(c.id);
        result += `👤 **${c.name}**\n`;
        result += `- SĐT: ${c.phone}\n`;
        result += `- Email: ${c.email || "Chưa có"}\n`;
        result += `- Ngày ĐK: ${new Date(c.registration_date).toLocaleString()}\n`;
        
        if (orders.length > 0) {
            result += `- Lịch sử đơn hàng:\n`;
            orders.forEach(o => {
                result += `  + ID #${o.id}: ${o.amount.toLocaleString()}đ [${o.status.toUpperCase()}] (${new Date(o.order_date).toLocaleDateString()})\n`;
            });
        }
        result += `---\n`;
    });
    return result;
};

const editLandingPage = (selector, content, style) => {
    const htmlPath = path.join(__dirname, "index.html");
    if (!fs.existsSync(htmlPath)) return "❌ Không tìm thấy file index.html";
    
    const html = fs.readFileSync(htmlPath, "utf8");
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return `❌ Không tìm thấy phần tử nào với selector: "${selector}"`;

    elements.forEach(el => {
        if (content) el.textContent = content;
        if (style) {
            const styles = style.split(';').filter(s => s.trim());
            styles.forEach(s => {
                const [prop, val] = s.split(':').map(i => i.trim());
                if (prop && val) el.style[prop] = val;
            });
        }
    });

    fs.writeFileSync(htmlPath, dom.serialize());
    return `✅ Đã cập nhật thành công ${elements.length} phần tử.`;
};

// --- HTTP Server (Streamable HTTP / JSON-RPC) ---

const app = express();
app.use(express.json());

// Endpoint chính cho goClaw (Streamable HTTP)
app.post("/mcp", async (req, res) => {
    const { method, params, id } = req.body;

    console.log(`[MCP Request] Method: ${method}`);

    // 0. Xử lý lệnh initialize (Bắt tay ban đầu)
    if (method === "initialize") {
        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: "website-manager-mcp",
                    version: "1.0.0"
                }
            }
        });
    }

    // 0.5 Xử lý lệnh initialized (Thông báo hoàn tất bắt tay - không cần trả về body)
    if (method === "notifications/initialized") {
        console.log("[MCP] Handshake complete");
        return res.status(200).end();
    }

    // 1. Khai báo danh sách tools
    if (method === "tools/list") {
        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                tools: [
                    {
                        name: "get_daily_summary",
                        description: "Lấy báo cáo tóm tắt tình hình lead, đơn hàng và doanh thu hôm nay.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "find_customer_info",
                        description: "Tìm kiếm thông tin khách hàng và lịch sử đơn hàng bằng tên hoặc SĐT.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Tên hoặc SĐT khách hàng" }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "edit_landing_page",
                        description: "Chỉnh sửa nội dung chữ hoặc style CSS của landing page.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                selector: { type: "string", description: "CSS Selector (ví dụ: #hero-title)" },
                                content: { type: "string", description: "Nội dung chữ mới" },
                                style: { type: "string", description: "Chuỗi CSS (ví dụ: color: blue;)" }
                            },
                            required: ["selector"]
                        }
                    }
                ]
            }
        });
    }

    // 2. Xử lý gọi tool
    if (method === "tools/call") {
        const { name, arguments: args } = params;
        let responseText = "";

        try {
            if (name === "get_daily_summary") responseText = getDailySummary();
            else if (name === "find_customer_info") responseText = findCustomerInfo(args.query);
            else if (name === "edit_landing_page") responseText = editLandingPage(args.selector, args.content, args.style);
            else throw new Error(`Tool not found: ${name}`);

            return res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    content: [{ type: "text", text: responseText }]
                }
            });
        } catch (error) {
            return res.json({
                jsonrpc: "2.0",
                id,
                error: { code: -32603, message: error.message }
            });
        }
    }

    res.status(404).json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

// Thêm GET /mcp để tránh lỗi 404 khi goClaw test connection
app.get("/mcp", (req, res) => {
    res.send("MCP Server is ready! Please use POST for JSON-RPC requests.");
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", type: "streamable-http" }));

const PORT = 3001;
// Lắng nghe 0.0.0.0 để đảm bảo goClaw có thể kết nối được kể cả qua IP Public
app.listen(PORT, "0.0.0.0", () => {
    console.log(`MCP Streamable-HTTP Server running on port ${PORT}`);
    console.log(`Endpoint: http://127.0.0.1:${PORT}/mcp`);
});
