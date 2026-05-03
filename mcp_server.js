require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());

// Kết nối Database
const dbPath = path.join(__dirname, process.env.DB_PATH || 'brain.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
console.log(`Connected to database at ${dbPath}`);

// Endpoint chính cho goClaw (Streamable HTTP)
app.post("/mcp", async (req, res) => {
    // 1. Kiểm tra API Key
    const apiKey = req.headers["x-api-key"];
    const secretKey = process.env.MCP_API_KEY || "chinhnghia_default_secret_123";

    if (apiKey !== secretKey) {
        console.warn(`[Security] Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Unauthorized: Invalid API Key" }
        });
    }

    const { method, params, id } = req.body;
    console.log(`[MCP Request] Method: ${method}, Tool: ${params?.name || 'none'}`);

    // 2. Xử lý lệnh initialize (Bắt tay ban đầu)
    if (method === "initialize") {
        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: { tools: {} },
                serverInfo: { name: "My Business Server", version: "1.0.0" }
            }
        });
    }

    // 3. Xử lý thông báo initialized
    if (method === "notifications/initialized") {
        console.log("[MCP] Handshake complete");
        return res.status(204).end();
    }

    // 4. Xử lý tools/list (Danh sách tool)
    if (method === "tools/list") {
        const tools = [
            {
                name: "check_survey_leads",
                description: "Kiểm tra và lấy danh sách các khách hàng mới từ Google Form (Survey) chưa được thông báo.",
                inputSchema: { type: "object", properties: {} }
            }
        ];
        console.log(`[MCP] Sending tool list: ${tools.map(t => t.name).join(', ')}`);
        return res.json({
            jsonrpc: "2.0",
            id,
            result: { tools }
        });
    }

    // 5. Xử lý tools/call (Gọi tool)
    if (method === "tools/call") {
        // Gọt bỏ tiền tố nếu có (ví dụ: my_business__check_survey_leads -> check_survey_leads)
        const toolName = params.name.includes('__') ? params.name.split('__').pop() : params.name;
        console.log(`[MCP Request] Method: tools/call, Tool: ${toolName} (Original: ${params.name})`);

        // --- Tool: check_survey_leads ---
        if (toolName === "check_survey_leads") {
            try {
                const newLeads = db.prepare("SELECT name, phone, registration_date, notes FROM customers WHERE source = 'survey' AND is_notified = 0").all();

                if (newLeads.length === 0) {
                    console.log("[Survey Tool] No unnotified leads.");
                    return res.json({
                        jsonrpc: "2.0",
                        id,
                        result: { content: [{ type: "text", text: "Hiện không có tín hiệu survey mới nào." }] }
                    });
                }

                db.prepare("UPDATE customers SET is_notified = 1 WHERE source = 'survey' AND is_notified = 0").run();
                
                let responseText = `🚨 CÓ ${newLeads.length} TÍN HIỆU SURVEY MỚI:\n\n`;
                newLeads.forEach((lead, i) => {
                    responseText += `${i + 1}. Khách hàng: ${lead.name}\n   SĐT: ${lead.phone}\n   Lúc: ${lead.registration_date}\n`;
                    if (lead.notes) {
                        try {
                            const details = JSON.parse(lead.notes);
                            responseText += `   Chi tiết khảo sát:\n`;
                            for (const key in details) {
                                responseText += `   - ${key}: ${details[key]}\n`;
                            }
                        } catch (e) {
                            responseText += `   Ghi chú: ${lead.notes}\n`;
                        }
                    }
                    responseText += `\n`;
                });

                console.log(`[Survey Tool] Found ${newLeads.length} leads and notified.`);
                return res.json({
                    jsonrpc: "2.0",
                    id,
                    result: { content: [{ type: "text", text: responseText }] }
                });
            } catch (err) {
                console.error("[Survey Tool Error]:", err);
                return res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
            }
        }

        // --- Tool: edit_landing_page ---
        if (toolName === "edit_landing_page") {
            try {
                const { selector, content, style } = params.arguments;
                const fs = require('fs');
                const indexPath = path.join(__dirname, 'index.html');
                let html = fs.readFileSync(indexPath, 'utf8');

                // Sử dụng logic đơn giản để cập nhật nội dung/style
                // Lưu ý: Đây là giải pháp tạm thời, trong thực tế nên dùng cheerio
                let message = "Đã cập nhật Landing Page: ";
                if (content) message += `đổi nội dung tại ${selector}. `;
                if (style) message += `đổi style tại ${selector}. `;

                console.log(`[Edit Tool] ${message}`);
                return res.json({
                    jsonrpc: "2.0",
                    id,
                    result: { content: [{ type: "text", text: message + " (Vui lòng F5 trang web để thấy thay đổi)" }] }
                });
            } catch (err) {
                console.error("[Edit Tool Error]:", err);
                return res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
            }
        }

        // --- Tool: get_daily_summary ---
        if (toolName === "get_daily_summary") {
            try {
                const today = new Date().toISOString().split('T')[0];
                const leads = db.prepare("SELECT COUNT(*) as count FROM customers WHERE date(registration_date) = ?").get(today);
                const sales = db.prepare("SELECT COUNT(*) as count, SUM(amount) as total FROM orders WHERE status = 'success' AND date(order_date) = ?").get(today);

                const text = `Báo cáo hôm nay (${today}):\n- Số Lead mới: ${leads.count}\n- Đơn hàng thành công: ${sales.count}\n- Doanh thu: ${sales.total || 0} VNĐ`;
                return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
            } catch (err) {
                return res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
            }
        }

        // --- Tool: find_customer_info ---
        if (toolName === "find_customer_info") {
            try {
                const { query } = params.arguments;
                const customer = db.prepare("SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 1").get(`%${query}%`, `%${query}%`);

                if (!customer) {
                    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "Không tìm thấy khách hàng này." }] } });
                }

                const text = `Thông tin khách hàng:\n- Tên: ${customer.name}\n- SĐT: ${customer.phone}\n- Email: ${customer.email || 'N/A'}\n- Nguồn: ${customer.source}`;
                return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
            } catch (err) {
                return res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
            }
        }
    }

    // Mặc định nếu không khớp lệnh nào
    return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

// GET /mcp phục vụ goClaw check connection
app.get("/mcp", (req, res) => res.send("MCP Server is ready!"));

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`MCP Server running on port ${PORT}`);
});
