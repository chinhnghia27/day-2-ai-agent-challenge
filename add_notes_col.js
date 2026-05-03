const db = require('./node_modules/better-sqlite3')('/opt/my-website/brain.db');
try {
    db.prepare('ALTER TABLE customers ADD COLUMN notes TEXT').run();
    console.log('Added notes column');
} catch (e) {
    console.log('Notes column already exists');
}
