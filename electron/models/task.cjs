// src/models/Task.js
const db = require('../db/database');

// Status types: 'todo' | 'in_progress' | 'on_hold' | 'completed' | 'archived'
class Task {
  static create({ name, project_id, status = 'todo' }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tasks (name, project_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [name, project_id, status, timestamp, timestamp],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, project_id, status, created_at: timestamp, updated_at: timestamp });
        }
      );
    });
  }

  static findAll(project_id, statusFilter = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM tasks WHERE project_id = ?`;
      let params = [project_id];
      
      if (statusFilter) {
        query += ` AND status = ?`;
        params.push(statusFilter);
      }
      
      query += ` ORDER BY name ASC`;
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
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

  static update(id, data) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }
      
      fields.push('updated_at = ?');
      values.push(timestamp);
      values.push(id);
      
      db.run(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ id, ...data, updated_at: timestamp });
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
