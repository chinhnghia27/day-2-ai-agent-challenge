const db = require('./node_modules/better-sqlite3')('/opt/my-website/brain.db');
const all = db.prepare("SELECT id, name, phone, is_notified, notes, registration_date FROM customers WHERE source = 'survey' ORDER BY id DESC").all();
console.log('--- START ---');
console.log('TOTAL:' + all.length);
console.log('DATA:' + JSON.stringify(all, null, 2));
console.log('--- END ---');
