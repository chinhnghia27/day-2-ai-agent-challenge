# Danh sách 3 MCP Functions ưu tiên build cho Telegram Bot

Dưới đây là 3 function quan trọng nhất đã được chọn để triển khai, giúp bạn quản lý website và nội dung trực tiếp qua Telegram.

---

### 1. get_daily_summary
* **Tên function:** `get_daily_summary`
* **Input params:** Không có
* **Output dự kiến:** 
    - Tổng số lead mới hôm nay.
    - Tổng số đơn hàng thành công & doanh thu.
    - Danh sách đơn hàng đang chờ (pending).
* **Tình huống dùng:** Xem nhanh hiệu quả kinh doanh mà không cần mở máy tính.
* **Ví dụ câu nhắn:** 
    - "Hôm nay tình hình thế nào rồi?"
    - "Báo cáo doanh thu ngày hôm nay."
* **Độ ưu tiên:** 5/5

### 2. find_customer_info
* **Tên function:** `find_customer_info`
* **Input params:** `query` (string - tên hoặc số điện thoại)
* **Output dự kiến:** 
    - Thông tin liên hệ: Tên, SĐT, Email, Zalo.
    - Lịch sử mua hàng và trạng thái email sequence.
* **Tình huống dùng:** Tra cứu nhanh thông tin khi đang chat với khách trên điện thoại.
* **Ví dụ câu nhắn:** 
    - "Check hộ tớ số 0912345678"
    - "Khách hàng Nguyễn Văn A đã mua khóa học chưa?"
* **Độ ưu tiên:** 5/5

### 3. edit_landing_page
* **Tên function:** `edit_landing_page`
* **Input params:** 
    - `selector` (string): ID hoặc Class của phần tử cần sửa (ví dụ: `#hero-title`).
    - `content` (string, optional): Nội dung chữ mới.
    - `style` (string, optional): Mã CSS mới (ví dụ: `color: red;`).
* **Output dự kiến:** Thông báo cập nhật thành công và link xem trước thay đổi.
* **Tình huống dùng:** Thay đổi tiêu đề, giá bán hoặc màu sắc nút bấm ngay lập tức để tối ưu chuyển đổi khi đang chạy campaign.
* **Ví dụ câu nhắn:** 
    - "Đổi tiêu đề chính thành 'Làm chủ CapCut trong 7 ngày' giúp tớ."
    - "Đổi màu nút đăng ký sang màu cam nổi bật hơn đi."
* **Độ ưu tiên:** 4/5
