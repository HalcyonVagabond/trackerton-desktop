// src/db/organizationDb.js
const db = require('./database');

function initOrganizationTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        created_at TEXT,
        updated_at TEXT
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  initOrganizationTable,
  // Add any raw queries if needed
};
