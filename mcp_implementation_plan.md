# Kế hoạch triển khai MCP Server

Tôi sẽ xây dựng một MCP Server bằng Node.js để tích hợp trực tiếp với codebase hiện tại của bạn.

### 1. Kiến trúc
- **Ngôn ngữ:** Node.js
- **Thư viện chính:** `@modelcontextprotocol/sdk`, `better-sqlite3`, `jsdom`.
- **Kết nối:** MCP Server sẽ chạy như một process riêng, truy cập trực tiếp vào file `brain.db` và `index.html`.

### 2. Chi tiết triển khai từng Function

#### A. `get_daily_summary`
- **Logic:** Chạy câu lệnh SQL `SELECT` đếm số lượng bản ghi trong ngày hôm nay từ bảng `customers` và `orders`. Tính tổng `amount` của các đơn hàng có trạng thái `success`.
- **Output:** Trả về một chuỗi văn bản đã được format đẹp để Agent gửi lên Telegram.

#### B. `find_customer_info`
- **Logic:** Chạy SQL `SELECT` với toán tử `LIKE %query%` trên cột `name` hoặc `phone`. Join với bảng `orders` để lấy lịch sử mua hàng.
- **Output:** Trả về JSON hoặc Markdown mô tả thông tin khách hàng.

#### C. `edit_landing_page`
- **Logic:** 
    1. Đọc nội dung file `index.html`.
    2. Sử dụng `jsdom` để parse HTML.
    3. Tìm phần tử dựa trên `selector`.
    4. Cập nhật `textContent` hoặc `style`.
    5. Ghi đè lại file `index.html`.
- **An toàn:** Sẽ có cơ chế backup file trước khi sửa để tránh lỗi làm sập landing page.

### 3. Các bước tiếp theo
1. Cài đặt các thư viện cần thiết.
2. Tạo file `mcp_server.js`.
3. Test thử nghiệm các function qua Agent.

Bạn có đồng ý với kế hoạch này không? Nếu có, tôi sẽ bắt đầu cài đặt thư viện ngay.
