const db = require('../db/database');

// Status types: 'active' | 'inactive' | 'archived'
class Organization {
  static create({ name, status = 'active' }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organizations (name, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [name, status, timestamp, timestamp],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, status, created_at: timestamp, updated_at: timestamp });
        }
      );
    });
  }

  static findAll(statusFilter = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM organizations`;
      let params = [];
      
      if (statusFilter) {
        query += ` WHERE status = ?`;
        params.push(statusFilter);
      }
      
      query += ` ORDER BY name ASC`;
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM organizations WHERE id = ?`, [id], (err, row) => {
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
        `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`,
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
      db.run(`DELETE FROM organizations WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Organization;
