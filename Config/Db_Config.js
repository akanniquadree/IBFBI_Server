const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  multipleStatements: true, // Allow multiple queries at once
});

db.connect(function (err) {
  if (err) throw err;
  console.log("Database Connected");
  const createTable = `
        CREATE TABLE IF NOT EXISTS program (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        img TEXT,
        createdBy INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES admin(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS blog(
        id INT AUTO_INCREMENT PRIMARY KEY,
        img TEXT,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        paraOne TEXT NOT NULL,
        paraTwo TEXT,
        createdBy INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES admin (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS partner_Image(
        id INT AUTO_INCREMENT PRIMARY KEY,
        img JSON,
        createdBy INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES admin (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS galleryCat(
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        createdBy INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES admin (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS gallery(
        id INT AUTO_INCREMENT PRIMARY KEY,
        img JSON,
        gallerycat_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gallerycat_id) REFERENCES galleryCat(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS admin(
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255),
        name VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS blacklistToken(
        id INT AUTO_INCREMENT PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        
    `;
  db.query(createTable, function (err) {
    if (err) {
      console.error("Error creating tables: ", err);
      return;
    }
    console.log("Tables checked/created successfully");
  });
});

module.exports = db;
