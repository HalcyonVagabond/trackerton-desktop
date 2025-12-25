// src/models/TimeEntry.js
const db = require('../db/database');

class TimeEntry {
  static create({ task_id, duration, timestamp, notes = null }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO time_entries (task_id, duration, timestamp, notes) VALUES (?, ?, ?, ?)`,
        [task_id, duration, timestamp, notes],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, task_id, duration, timestamp, notes });
        }
      );
    });
  }

  static findAll(filter = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT te.*, t.name AS task_name, p.name AS project_name, o.name AS organization_name
        FROM time_entries te
        JOIN tasks t ON te.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        JOIN organizations o ON p.organization_id = o.id
      `;
      const params = [];
      const conditions = [];

      if (filter.organizationId) {
        conditions.push('o.id = ?');
        params.push(filter.organizationId);
      }
      if (filter.projectId) {
        conditions.push('p.id = ?');
        params.push(filter.projectId);
      }
      if (filter.taskId) {
        conditions.push('t.id = ?');
        params.push(filter.taskId);
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static update(id, { duration, timestamp, notes }) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (duration !== undefined) {
        fields.push('duration = ?');
        values.push(duration);
      }
      if (timestamp !== undefined) {
        fields.push('timestamp = ?');
        values.push(timestamp);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        values.push(notes);
      }
      
      values.push(id);
      
      db.run(
        `UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ id, duration, timestamp, notes });
        }
      );
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM time_entries WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Optionally, a method to find the latest time entry for a task
  static findLatestByTaskId(task_id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM time_entries WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1`,
        [task_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static getTotalDurationByTaskId(task_id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(duration) as total_duration FROM time_entries WHERE task_id = ?`,
        [task_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total_duration || 0);
        }
      );
    });
  }
}



module.exports = TimeEntry;
