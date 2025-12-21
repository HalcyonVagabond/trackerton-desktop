// src/db/taskDb.js
const db = require('./database');

function initTaskTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        project_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  initTaskTable,
  // Add any raw queries if needed
};
