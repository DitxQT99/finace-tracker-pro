const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'finance.db');
const db = sqlite3(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables from schema.sql
const initSQL = require('fs').readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(initSQL);

module.exports = db;
