const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Initializes the database by creating tables if they do not exist.
 * This function defines the table structures and ensures that all necessary
 * tables are present with the correct schema.
 */
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT(11) NOT NULL AUTO_INCREMENT,
          user_id INT(11) NOT NULL,
          username VARCHAR(255) NOT NULL,
          nickname VARCHAR(255) DEFAULT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS servers (
          id INT(11) NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          hostname VARCHAR(255) NOT NULL,
          version VARCHAR(50) DEFAULT NULL,
          npc_name VARCHAR(255) DEFAULT NULL,
          npc_x FLOAT DEFAULT NULL,
          npc_y FLOAT DEFAULT NULL,
          npc_z FLOAT DEFAULT NULL,
          regex_money VARCHAR(255) DEFAULT NULL,
          regex_username VARCHAR(255) DEFAULT NULL,
          regex_chatmessage VARCHAR(255) DEFAULT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT(11) NOT NULL AUTO_INCREMENT,
          username VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id INT(11) NOT NULL AUTO_INCREMENT,
          user_id INT(11) NOT NULL,
          account_id INT(11) NOT NULL,
          server_id INT(11) NOT NULL,
          auth VARCHAR(50) DEFAULT NULL,
          blacklist TEXT DEFAULT NULL,
          status VARCHAR(50) DEFAULT NULL,
          autorestart TINYINT(1) DEFAULT 0,
          modules LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}',
          PRIMARY KEY (id),
          KEY account_id (account_id),
          KEY server_id (server_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.commit();
      console.log('Database tables initialized successfully.');
    } catch (err) {
      await connection.rollback();
      console.error('Error initializing database tables:', err);
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
};

initializeDatabase();

module.exports = pool;
