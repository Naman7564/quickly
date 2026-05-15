const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/quickly.db';
let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dbDir = path.dirname(path.resolve(DB_PATH));

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Always try to load from file first
  if (fs.existsSync(DB_PATH)) {
    try {
      const buffer = fs.readFileSync(DB_PATH);
      if (buffer.length > 0) {
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }
    } catch {
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=MEMORY;');
  db.run('PRAGMA foreign_keys=ON;');

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dbDir = path.dirname(path.resolve(DB_PATH));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save on exit and periodically
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

setInterval(() => {
  try { saveDb(); } catch (e) { /* ignore */ }
}, 10000);

module.exports = { getDb, saveDb };
