// src/db/taskDb.js
const db = require('./database');

function initTaskTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        status TEXT DEFAULT 'todo',
        project_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Add status column if it doesn't exist (migration)
        db.run(`ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'todo'`, (alterErr) => {
          // Ignore error if column already exists
          resolve();
        });
      }
    });
  });
}

module.exports = {
  initTaskTable,
  // Add any raw queries if needed
};
