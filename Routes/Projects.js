const express = require("express");
const db = require("../Config/Db_Config");
const { upload, checkTitleExists, UpdatecheckTitleExists } = require("../Config/Upload_Config");
const cloudinary = require("../Config/Cloudinary_Config");
const { authenticate, checkPermission } = require("../Config/Auth");

const programRoute = express.Router();

// Get all program
programRoute.get("/programs", (req, res) => {
  try {
    db.query(
      `SELECT program.id AS id, program.title,program.img, program.description, admin.id AS admin_id, admin.role ,admin.name FROM program INNER JOIN admin ON  program.createdBy = admin.id ORDER BY program.created_at DESC` ,
      function (err, data) {
        if (err) {
          return res
            .status(404)
            .json({ err, error: "Error in getting program" });
        }
        return res.status(200).json(data);
      }
    );
  } catch (error) {
    return res.status(500).json("Internal Error");
  }
});

//Get a particular program
programRoute.get("/programs/:id", (req, res) => {
  try {
    const id = req.params.id;
    const q = "SELECT * FROM program WHERE id = ? ";
    const value = [id];
    db.query(q, value, function (err, data) {
      if (err) {
        return res.status(404).json({ err, error: "Error in getting program" });
      }
      return res.status(200).json(data);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

programRoute.post(
  "/programs/:title",
  authenticate,
  checkTitleExists("program"),
  upload("program").single("img"),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const ownerId = req.user.id;
      const img = req.file ? req.file.path : null;
      if (!title || !img || !description) {
        return res
          .status(422)
          .json({ error: "Fill/Upload all required Fields" });
      }
      // Check if the title exist in the database
      const check = "SELECT * FROM program WHERE title = ?";
      db.query(check, [title], function (err, data) {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (data.length > 0) {
          return res.status(409).json({ error: "Title already exists" });
        }
        // if it doesnt exist the save
        const q =
          " INSERT INTO program (title, description, img, createdBy) VALUES (?,?,?,?)";
        const values = [title, description, img, ownerId];
        db.query(q, values, function (err) {
          if (err) throw err;
          return res
            .status(201)
            .json({ message: "Program Created Successfully " });
        });
      });
    } catch (error) {
      console.log(error)
      return res.status(500).json(error);
    }
  }
);

programRoute.put(
  "/programs/:id/:title",
  authenticate,
  checkPermission("program", "createdBy", "update"),
  UpdatecheckTitleExists('program'),
  upload("program").single("img"),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const id = req.params.id;
      const ownerId = req.user.id;
      const img = req.file ? req.file.path : null;
      if (!title || !img || !description) {
        return res
          .status(422)
          .json({ error: "Fill/Upload all required Fields" });
      }
      //   Get The databse of the previous Data before deleting from the cloudinary
      const prev = "SELECT * FROM program WHERE id = ?";
      db.query(prev, [id], async function (err, data) {
        try {
          if (err) {
            console.error("Error updating data:", err);
            return res.status(500).json({ error: "Database error" });
          }
          if (data.length === 0) {
            return res.status(404).json({ error: "Program not found" });
          }
          //if the new title is different from the old title then delete the previous title folder
          if (title !== data[0].title) {
            const name = data[0].title.replace(/\s+/g, "_");
            const folderName = `IBFBI/program/${name}`;
            // Check if there is image in the folder
            cloudinary.api.delete_resources_by_prefix(
              folderName,
              function (err, data) {
                if (err) {
                  console.error("Cloudinary Image Deletion Error:", err);
                  return res
                    .status(500)
                    .json({ error: "Error deleting images from Cloudinary" });
                }
                console.log("Images Deleted:", data);
                cloudinary.api.delete_folder(
                  folderName,
                  async (error, reslt) => {
                    if (error) {
                      console.error("Cloudinary Folder Deletion Error:", error);
                      return res.status(500).json({
                        error: "Error deleting folder from Cloudinary",
                      });
                    }

                    console.log("Folder Deleted:", reslt);
                    // Then update the database
                    const q = `
              UPDATE program SET title = ?, description = ?, img = ?, createdBy = ?, WHERE id = ?
              `;
                    const values = [title, description, img, ownerId, id];
                    db.query(q, values, function (err, result) {
                      if (err) {
                        console.error("Error updating data:", err);
                        return res
                          .status(500)
                          .json({ error: "Database error" });
                      }
                      if (result.affectedRows === 0) {
                        return res
                          .status(404)
                          .json({ error: "Program not found" });
                      }
                      return res
                        .status(201)
                        .json({ message: "Program Updated Successfully" });
                    });
                  }
                );
              }
            );
          }
          // Else just delete the old image
          else {
            const name = data[0].img;
            // Check if there is image in the folder then delete
            const public_url = name
              .replace(
                /^https:\/\/res.cloudinary.com\/[^/]+\/image\/upload\/v\d+\//,
                ""
              ) // Removes base URL & version
              .replace(/\.[^/.]+$/, ""); // Removes file extension

            cloudinary.uploader.destroy(public_url, function (err, data) {
              if (err) {
                console.error("Cloudinary Image Deletion Error:", err);
                return res
                  .status(500)
                  .json({ error: "Error deleting images from Cloudinary" });
              }
              console.log("Images Deleted:", data);
              const q = `
        UPDATE program SET title = ?, description = ?, img = ?, createdBy = ? WHERE id = ?
        `;
              const values = [title, description, img, ownerId, id];
              db.query(q, values, function (err, result) {
                if (err) {
                  console.error("Error updating data:", err);
                  return res.status(500).json({ error: "Database error" });
                }
                if (result.affectedRows === 0) {
                  return res.status(404).json({ error: "Program not found" });
                }
                return res
                  .status(201)
                  .json({ message: "Program Updated Successfully" });
              });
            });
          }
        } catch (error) {
          return res.status(500).json(error);
        }
      });
    } catch (error) {
      return res.status(500).json(error);
    }
  }
);

programRoute.delete(
  "/programs/:id",
  authenticate,
  checkPermission("program", "createdBy", "delete"),
  async (req, res) => {
    const id = req.params.id;
    try {
      const q = "SELECT * FROM program WHERE id = ?";
      db.query(q, [id], function (err, data) {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (data.length === 0) {
          return res.status(404).json({ error: "Program not found" });
        }
        //   Delete the Image from Clodinary
        const title = data[0].title;
        const sanitizedTitle = title.replace(/\s+/g, "_"); // Ensure it's correctly formatted
        const folderName = `IBFBI/program/${sanitizedTitle}`;
        cloudinary.api.delete_resources_by_prefix(
          folderName,
          async function (err, result) {
            if (err) {
              console.error("Cloudinary Image Deletion Error:", err);
              return res
                .status(500)
                .json({ error: "Error deleting images from Cloudinary" });
            }
            console.log("Images Deleted:", result);
            // 🔹 3. Delete the Folder Itself
            cloudinary.api.delete_folder(folderName, async (error, reslt) => {
              if (error) {
                console.error("Cloudinary Folder Deletion Error:", error);
                return res
                  .status(500)
                  .json({ error: "Error deleting folder from Cloudinary" });
              }

              console.log("Folder Deleted:", reslt);
              const deleteQuery = "DELETE FROM program WHERE id = ?";
              db.query(deleteQuery, [id], (errrr) => {
                if (errrr) {
                  console.error("Database Deletion Error:", errrr);
                  return res
                    .status(500)
                    .json({ error: "Error deleting from database" });
                }
                return res
                  .status(200)
                  .json({ message: "Program deleted successfully" });
              });
            });
          }
        );
      });
    } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = programRoute;
