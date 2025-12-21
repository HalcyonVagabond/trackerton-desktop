// src/models/Task.js
const db = require('../db/database');

class Task {
  static create({ name, project_id }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tasks (name, project_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [name, project_id, timestamp, timestamp],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, project_id, created_at: timestamp, updated_at: timestamp });
        }
      );
    });
  }

  static findAll(project_id) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM tasks WHERE project_id = ?`,
        [project_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Methods: findById, update, delete
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static update(id, { name }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE tasks SET name = ?, updated_at = ? WHERE id = ?`,
        [name, timestamp, id],
        function (err) {
          if (err) reject(err);
          else resolve({ id, name, updated_at: timestamp });
        }
      );
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Task;
