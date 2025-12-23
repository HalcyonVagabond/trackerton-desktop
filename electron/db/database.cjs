// src/db/database.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'trackerton.db');

const db = new sqlite3.Database(dbPath);

module.exports = db;
