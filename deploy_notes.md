# Deploy Notes - CapCut Master CRM

Dự án này sử dụng **Node.js** với framework **Express** và cơ sở dữ liệu **SQLite**.

## 1. Biến môi trường (.env) cần thiết trên VPS
Bạn cần tạo file `.env` tại thư mục gốc trên VPS với các biến sau:

```env
# Server Port
PORT=3000

# Resend Email Service
RESEND_API_KEY=re_xxx (Lấy từ resend.com)

# Admin Credentials
ADMIN_USER=admin
ADMIN_PASSWORD=your_strong_password

# Payment Info (Hiển thị trên Frontend)
BANK_ACC=96247NGHIA27
BANK_NAME=BIDV

# Backup & Storage
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
DB_PATH=brain.db
```

## 2. Các lệnh để chạy server

### Cài đặt dependencies:
```bash
npm install
```

### Chạy server bằng PM2 (Khuyên dùng cho Production):
```bash
# Cài đặt PM2 nếu chưa có
sudo npm install -g pm2

# Chạy server
pm2 start ecosystem.config.js

# Xem log
pm2 logs capcut-crm

# Tự động chạy lại khi server reboot
pm2 save
pm2 startup
```

### Chạy trực tiếp (để test):
```bash
node server.js
```

## 3. Cổng (Port) và Truy cập
- Server đang lắng nghe tại cổng: **3000** (Hoặc theo biến `PORT` trong `.env`).
- Trang chủ: `http://<IP_CUA_BAN>:3000`
- Quản trị: `http://<IP_CUA_BAN>:3000/admin` (Sử dụng `ADMIN_USER` và `ADMIN_PASSWORD` đã set).

## 4. Lưu ý về Database
- Database SQLite được lưu tại file cấu hình trong `DB_PATH` (mặc định là `brain.db`).
- File này đã được đưa vào `.gitignore` để tránh đè dữ liệu thật bằng dữ liệu test.
- Đảm bảo thư mục dự án trên VPS có quyền ghi để SQLite có thể tạo/cập nhật file database.
