// src/db/taskDb.js
const db = require('./database');

function initTaskTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
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
        // Run migrations for existing databases
        const migrations = [
          // Add status column if it doesn't exist
          new Promise((res) => {
            db.run(`ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'todo'`, () => res());
          }),
          // Add description column if it doesn't exist
          new Promise((res) => {
            db.run(`ALTER TABLE tasks ADD COLUMN description TEXT`, () => res());
          }),
        ];
        Promise.all(migrations).then(() => resolve());
      }
    });
  });
}

module.exports = {
  initTaskTable,
  // Add any raw queries if needed
};
