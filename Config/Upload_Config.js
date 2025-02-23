const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./Cloudinary_Config");
const db = require("./Db_Config");

/**
 * Middleware to check if the title already exists in the database
 */
const checkTitleExists = (folder) => async (req, res, next) => {
  const { title } = req.params;
  const folderName = folder || "default_folder";

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const checkQuery = `SELECT * FROM ${folderName} WHERE title = ?`;
  db.query(checkQuery, [title], (err, data) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (data.length > 0) {
      return res.status(409).json({ error: "Title already exists" });
    }
    // If title doesn't exist, proceed to upload
    next();
  });
};

const UpdatecheckTitleExists = (folder) => async (req, res, next) => {
  const { title } = req.params;
  const folderName = folder || "default_folder";

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const existQuery = `SELECT * FROM ${folderName} WHERE id =?`;
  db.query(existQuery, [req.params.id], function (err, data) {
    if (err) return res.status(500).json({ error: "Database error!" });

    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    // 2️⃣ If email is being changed, check if it's already taken
    if (title !== data[0].title) {
      const checkQuery = `SELECT * FROM ${folderName} WHERE title = ?`;
      db.query(checkQuery, [title], function (err, result) {
        if (err) return res.status(500).json({ error: "Database error!" });

        if (data.length > 0) {
          return res.status(404).json({ error: "Title already Exist" });
        }
        next();
      });
    } else {
      next();
    }
  });
};

// Function to create a storage instance where title becomes the folder name
const storage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const title = req.params.title || "untitled"; // Default if no title is provided
      const sanitizedTitle = title.replace(/\s+/g, "_"); // Replace spaces with underscores
      const timestamp = Date.now(); // Ensure unique filenames
      if (req.params.title) {
        return {
          folder: `IBFBI/${folderName}/${sanitizedTitle}`, // Title becomes the folder name
          format: "png", // Change based on your needs
          public_id: `${timestamp}`, // Filename is just the timestamp
        };
      }
      return {
        folder: `IBFBI/${folderName}`, // Title becomes the folder name
        format: "png", // Change based on your needs
        public_id: `${timestamp}`, // Filename is just the timestamp
      };
    },
  });
};

const upload = (folderName) => multer({ storage: storage(folderName) });

module.exports = { checkTitleExists, upload, UpdatecheckTitleExists};
