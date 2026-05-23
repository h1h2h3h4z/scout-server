const mysql = require("mysql2");
require("dotenv").config();
const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
  } else {
    console.log("✅ Connected to MySQL database!");
  }
});

module.exports = db;