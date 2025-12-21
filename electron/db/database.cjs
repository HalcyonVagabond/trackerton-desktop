// src/db/database.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

console.log("Hello from database.js");
const dbPath = path.join(app.getPath('userData'), 'trackerton.db');
console.log(app.getPath('userData'), "userData path");

const db = new sqlite3.Database(dbPath);

module.exports = db;
