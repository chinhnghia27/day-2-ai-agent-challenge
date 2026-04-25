# CapCut Master CRM 🚀

Hệ thống quản lý khách hàng và tự động hóa email cho khóa học CapCut Master.

## 🛠️ Công nghệ sử dụng
- **Backend:** Node.js, Express.js
- **Database:** SQLite (`better-sqlite3`)
- **Email:** Resend API
- **Frontend:** Vanilla HTML/JS/CSS

## 🚀 Hướng dẫn Deployment nhanh trên VPS Linux

### 1. Chuẩn bị môi trường
Cài đặt Node.js và PM2:
```bash
# Cài đặt Node.js v18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2
sudo npm install pm2 -g
```

### 2. Cấu hình dự án
1. Clone dự án về VPS.
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Tạo file `.env` từ mẫu:
   ```bash
   cp .env.example .env
   ```
4. Chỉnh sửa `.env` và điền các thông tin:
   - `RESEND_API_KEY`: Lấy từ Resend Dashboard.
   - `ADMIN_USER` & `ADMIN_PASSWORD`: Dùng để đăng nhập trang quản trị.

### 3. Chạy ứng dụng
Sử dụng PM2 để chạy app trong background:
```bash
pm2 start ecosystem.config.js
```

Để app tự khởi động cùng hệ thống:
```bash
pm2 save
pm2 startup
```

### 4. Cấu hình Nginx (Reverse Proxy)
Cấu hình Nginx để trỏ domain về port 3000:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Bảo mật
- Trang quản trị tại `/admin` đã được bảo vệ bằng Basic Auth.
- Các file nhạy cảm như `.env` và `brain.db` đã được chặn truy cập từ bên ngoài qua middleware.

## 📂 Cấu trúc thư mục chính
- `server.js`: Entry point của ứng dụng.
- `brain.db`: File cơ sở dữ liệu SQLite.
- `admin.html`: Giao diện quản trị.
- `index.html`: Landing page bán hàng.
