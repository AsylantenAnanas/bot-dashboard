// server/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'botuser',
  password: 'botpass',
  database: 'minecraft_bots'
});

module.exports = pool;
