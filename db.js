const mysql = require("mysql2");

const pool = mysql.createPool({
  port: process.env.DB_PORT || 3306,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: "Z",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.on('error', (error) => {
    console.error('Unexpected erroror on idle client', error);
    process.exit(-1);
});

pool.getConnection((error, connection) => {
    if (error) {
        console.error("Database connection failed:", error.message);
    } else {
        console.log("Connected to MySQL via Pool");
        connection.release();
    }
});

module.exports = pool;