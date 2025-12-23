// src/db/organizationDb.js
const db = require('./database');

function initOrganizationTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Add status column if it doesn't exist (migration)
        db.run(`ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active'`, (alterErr) => {
          // Ignore error if column already exists
          resolve();
        });
      }
    });
  });
}

module.exports = {
  initOrganizationTable,
  // Add any raw queries if needed
};
