const db = require('./node_modules/better-sqlite3')('/opt/my-website/brain.db');
const res = db.prepare("UPDATE customers SET is_notified = 0 WHERE source = 'survey'").run();
console.log(`Reset thành công ${res.changes} khách hàng về trạng thái chưa báo.`);
