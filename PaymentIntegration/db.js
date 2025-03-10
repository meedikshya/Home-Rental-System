const { Sequelize } = require("sequelize");
require("dotenv").config();

// Simple database connection
const db = new Sequelize(
  process.env.MYSQL_DATABASE || "GharBhada",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "your_password",
  {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3307"),
    dialect: "mysql",
    logging: false,
  }
);

module.exports = { db };
