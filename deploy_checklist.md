# 📋 Deployment Checklist - CapCut Master CRM

Tôi đã kiểm tra toàn bộ thư mục dự án và dưới đây là kết quả phân tích để chuẩn bị cho việc deploy lên VPS vào ngày mai.

## 1. Ngôn ngữ & Framework
- **Backend:** Node.js (v18+ khuyến nghị).
- **Web Framework:** Express.js.
- **Database:** SQLite (`better-sqlite3`). Dữ liệu lưu tại file `brain.db`.
- **Frontend:** HTML/JS/CSS thuần (Vanilla), phục vụ trực tiếp từ server Node.js.
- **Email:** Resend API.

## 2. Các file cần tạo thêm
Tôi đã tạo sẵn cho bạn các file sau để tối ưu quá trình deploy:
- **`.env.example`**: File mẫu chứa các biến môi trường cần thiết. Bạn sẽ copy file này thành `.env` trên VPS và điền key thật vào.
- **`ecosystem.config.js`**: File cấu hình cho **PM2** (Process Manager) giúp ứng dụng tự khởi động lại nếu crash hoặc khi VPS reboot.

## 3. Kiểm tra thông tin bí mật (Secrets)
- **CẢNH BÁO:** File `resend_config.txt` đang chứa API Key của Resend (`re_7fRECU62_...`). 
    - *Hành động đã thực hiện:* Tôi đã thêm file này vào `.gitignore` để tránh bị lộ khi push lên GitHub.
    - *Khuyến nghị:* Bạn nên xóa file này sau khi đã copy Key vào `.env`.
- **`.env`**: Đã được ignore, hãy đảm bảo bạn không vô tình force add nó vào git.

## 4. Danh sách chuẩn bị trước khi Deploy

### A. Trên VPS Linux
1. **Cài đặt Node.js & NPM:** 
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
2. **Cài đặt PM2:** 
   ```bash
   sudo npm install pm2 -g
   ```
3. **Cài đặt Nginx:** (Làm Reverse Proxy để chạy port 80/443 và cài SSL)
   ```bash
   sudo apt install nginx
   ```

### B. Cấu hình bảo mật (Quan trọng)
- [ ] **Bảo mật Admin:** Hiện tại route `/admin` không có mật khẩu. Bất kỳ ai biết URL đều có thể xem và sửa dữ liệu khách hàng.
    - *Giải pháp nhanh:* Sử dụng **Basic Auth** trong Nginx hoặc thêm Middleware xác thực vào `server.js`.
- [ ] **Cấu hình Firewall:** Chỉ mở các port cần thiết (22 cho SSH, 80 cho HTTP, 443 cho HTTPS).
    ```bash
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw enable
    ```

### C. Quy trình thực hiện ngày mai
1. **Git Clone** dự án về VPS.
2. Chạy `npm install` để cài dependencies.
3. Tạo file `.env` từ `.env.example` và điền `RESEND_API_KEY`.
4. Chạy app bằng PM2: `pm2 start ecosystem.config.js`.
5. Cấu hình Nginx trỏ domain về `localhost:3000`.
6. Cài đặt SSL (Certbot/LetsEncrypt) để có HTTPS.

### D. Lưu ý về SQLite
- File `brain.db` sẽ nằm trực tiếp trên VPS. Hãy đảm bảo bạn có cơ chế **Backup** định kỳ file này (ví dụ: copy sang thư mục khác hoặc upload lên cloud mỗi ngày) vì SQLite không có server riêng.

---
*Chúc bạn deploy thành công vào ngày mai! Nếu cần hỗ trợ viết file config Nginx hoặc code xác thực cho trang Admin, hãy cho tôi biết.*
