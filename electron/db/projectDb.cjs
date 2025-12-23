// src/db/projectDb.js
const db = require('./database');

function initProjectTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        status TEXT DEFAULT 'in_progress',
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
          // Add status column if it doesn't exist (migration)
          db.run(`ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'in_progress'`, (statusErr) => {
            // Ignore errors if columns already exist
            resolve();
          });
        });
      }
    });
  });
}

module.exports = {
  initProjectTable,
  // Add any raw queries if needed
};
