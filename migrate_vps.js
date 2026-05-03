const db = require('./node_modules/better-sqlite3')('/opt/my-website/brain.db');
try {
    db.prepare('ALTER TABLE customers ADD COLUMN is_notified INTEGER DEFAULT 0').run();
    console.log('Added is_notified');
} catch (e) {
    console.log('is_notified already exists');
}
try {
    db.prepare("ALTER TABLE customers ADD COLUMN source TEXT DEFAULT 'lead'").run();
    console.log('Added source');
} catch (e) {
    console.log('source already exists');
}
