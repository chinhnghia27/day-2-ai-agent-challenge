const db = require('./node_modules/better-sqlite3')('/opt/my-website/brain.db');

const legacyData = [
    { phone: '03432468724', name: 'Loan', notes: { "Kỹ năng": "Mới bắt đầu", "Mục đích": "Xây kênh TikTok/Reels cá nhân", "Khó khăn": "Bí ý tưởng" } },
    { phone: '0123456789', name: 'chính', notes: { "Kỹ năng": "Đã biết cơ bản", "Mục đích": "Làm video bán hàng", "Khó khăn": "Bí ý tưởng" } },
    { phone: '03438893243', name: 'Nghĩa', notes: { "Kỹ năng": "Đã biết cơ bản", "Mục đích": "Quay vlog kỷ niệm", "Khó khăn": "Bí ý tưởng" } },
    { phone: '0397943229', name: 'Hoàng', notes: { "Kỹ năng": "Đã biết cơ bản", "Mục đích": "Xây kênh TikTok/Reels cá nhân", "Khó khăn": "Bí ý tưởng" } }
];

legacyData.forEach(item => {
    db.prepare("UPDATE customers SET notes = ?, is_notified = 0 WHERE phone = ?")
      .run(JSON.stringify(item.notes), item.phone);
});

console.log('Đã cập nhật dữ liệu chi tiết cho 4 khách hàng cũ.');
