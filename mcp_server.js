const { Server } = require("./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js");
const { SSEServerTransport } = require("./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/sse.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("./node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js");
const express = require("express");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Khởi tạo Database
const dbPath = path.join(__dirname, "brain.db");
const db = new Database(dbPath);

// Khởi tạo MCP Server
const server = new Server(
    {
        name: "website-manager-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 1. Tool: get_daily_summary
const getDailySummary = () => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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

// 2. Tool: find_customer_info
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
        } else {
            result += `- Chưa có đơn hàng nào.\n`;
        }
        result += `---\n`;
    });

    return result;
};

// 3. Tool: edit_landing_page
const editLandingPage = (selector, content, style) => {
    const htmlPath = path.join(__dirname, "index.html");
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
    return `✅ Đã cập nhật ${elements.length} phần tử khớp với "${selector}".`;
};

// Đăng ký Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_daily_summary",
                description: "Lấy báo cáo tóm tắt tình hình lead, đơn hàng và doanh thu trong ngày hôm nay.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "find_customer_info",
                description: "Tìm kiếm thông tin khách hàng và lịch sử đơn hàng bằng tên hoặc số điện thoại.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Tên hoặc số điện thoại khách hàng" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "edit_landing_page",
                description: "Chỉnh sửa nội dung chữ hoặc style CSS của landing page (index.html).",
                inputSchema: {
                    type: "object",
                    properties: {
                        selector: { type: "string", description: "CSS Selector (ví dụ: #hero-title, .btn-primary)" },
                        content: { type: "string", description: "Nội dung chữ mới" },
                        style: { type: "string", description: "Chuỗi CSS (ví dụ: color: blue; font-weight: bold;)" },
                    },
                    required: ["selector"],
                },
            },
        ],
    };
});

// Xử lý gọi Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "get_daily_summary") {
            const result = getDailySummary();
            return { content: [{ type: "text", text: result }] };
        }

        if (name === "find_customer_info") {
            const result = findCustomerInfo(args.query);
            return { content: [{ type: "text", text: result }] };
        }

        if (name === "edit_landing_page") {
            const result = editLandingPage(args.selector, args.content, args.style);
            return { content: [{ type: "text", text: result }] };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error) {
        return {
            content: [{ type: "text", text: `Lỗi: ${error.message}` }],
            isError: true,
        };
    }
});

// --- HTTP Server cho SSE ---
const app = express();
app.use(express.json());

let transport;

app.get("/sse", async (req, res) => {
    console.log("[SSE] New connection");
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);

    // Xử lý khi ngắt kết nối
    res.on("close", () => {
        console.log("[SSE] Connection closed");
        server.close();
    });
});

app.post("/messages", async (req, res) => {
    console.log("[Post] New message received");
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE transport");
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "mcp-server" });
});

const PORT = 3001;
app.listen(PORT, "127.0.0.1", () => {
    console.log(`MCP SSE Server running on http://127.0.0.1:${PORT}`);
    console.log(`SSE endpoint: http://127.0.0.1:${PORT}/sse`);
    console.log(`Message endpoint: http://127.0.0.1:${PORT}/messages`);
});
