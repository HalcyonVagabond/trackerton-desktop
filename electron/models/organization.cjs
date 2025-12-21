const db = require('../db/database');

class Organization {
  static create({ name }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organizations (name, created_at, updated_at) VALUES (?, ?, ?)`,
        [name, timestamp, timestamp],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, created_at: timestamp, updated_at: timestamp });
        }
      );
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM organizations`, [], (err, rows) => {
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

  static update(id, { name }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE organizations SET name = ?, updated_at = ? WHERE id = ?`,
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
      db.run(`DELETE FROM organizations WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Organization;
