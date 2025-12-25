// src/db/timeEntryDb.js
const db = require('./database');

function initTimeEntryTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        duration INTEGER,
        timestamp TEXT,
        notes TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks (id)
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Add notes column if it doesn't exist (migration for existing databases)
        db.run(`ALTER TABLE time_entries ADD COLUMN notes TEXT`, () => {
          // Ignore error if column already exists
          resolve();
        });
      }
    });
  });
}

module.exports = {
  initTimeEntryTable,
  // Add any raw queries if needed
};
