const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

/**
 * Create a MySQL connection pool.
 * A connection pool improves performance by reusing database connections
 * instead of opening and closing a new connection for every query.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST, // Database host (e.g., localhost)
  user: process.env.DB_USER, // Database user (e.g., root)
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME, // Database name
  waitForConnections: true, // Wait for a connection if none are available
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Unlimited queueing for connection requests
});

// Log successful pool creation
console.log("MySQL connection pool created successfully.");

// Log connection errors
pool.on("error", (err) => {
  console.error("MySQL pool error:", err);
});

// Log when a connection is acquired from the pool
pool.on("acquire", (connection) => {
  console.log("Connection acquired from pool:", connection.threadId);
});

// Log when a connection is released back to the pool
pool.on("release", (connection) => {
  console.log("Connection released back to pool:", connection.threadId);
});

module.exports = pool;
