// src/models/Project.js
const db = require('../db/database');

class Project {
  static create({ name, organization_id }) {
    console.log('Project.create called with name:', name, 'and organization_id:', organization_id);
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO projects (name, organization_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [name, organization_id, timestamp, timestamp],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, organization_id, created_at: timestamp, updated_at: timestamp });
        }
      );
    });
  }

  static findAll(organization_id) {
    console.log('Project.findAll called with organization_id:', organization_id);
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM projects WHERE organization_id = ?`,
        [organization_id],
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
      db.get(`SELECT * FROM projects WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static update(id, { name, description }) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
        [name, description || null, timestamp, id],
        function (err) {
          if (err) reject(err);
          else resolve({ id, name, updated_at: timestamp });
        }
      );
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM projects WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Project;
