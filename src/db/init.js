const initSQL = require('./schema');
const { getDb } = require('./connection');

async function initDatabase() {
  const db = await getDb();
  db.run(initSQL);
  console.log('Database initialized');
}

module.exports = { initDatabase };
