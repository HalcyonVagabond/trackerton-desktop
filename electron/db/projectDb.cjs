// src/db/projectDb.js
const db = require('./database');

function initProjectTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        organization_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (organization_id) REFERENCES organizations (id)
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Add description column if it doesn't exist (migration)
        db.run(`ALTER TABLE projects ADD COLUMN description TEXT`, (alterErr) => {
          // Ignore error if column already exists
          resolve();
        });
      }
    });
  });
}

module.exports = {
  initProjectTable,
  // Add any raw queries if needed
};
