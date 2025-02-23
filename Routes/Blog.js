const express = require("express");
const db = require("../Config/Db_Config");
const { checkTitleExists, upload, UpdatecheckTitleExists} = require("../Config/Upload_Config");
const cloudinary = require("../Config/Cloudinary_Config");
const { authenticate, checkPermission } = require("../Config/Auth");

const blogRoute = express.Router();

blogRoute.get("/blog", (req, res) => {
  db.query("SELECT blog.id AS id, blog.img, blog.paraOne, blog.paraTwo, blog.title, blog.date, admin.id AS admin_id, admin.role, admin.name FROM blog INNER JOIN admin ON blog.createdBy = admin.id ORDER BY admin.created_at DESC", function (err, data) {
    if (err) {
      console.log(err);
      return res.status(404).json({ error: err });
    }
    return res.status(200).json(data);
  });
});

blogRoute.get("/blog/:id", (req, res) => {
  const id = req.params.id;
  const q = "SELECT * FROM blog WHERE id = ?";
  db.query(q, [id], function (err, data) {
    if (err) {
      console.log(err);
      return res.status(404).json({ error: err });
    }
    if (data.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }
    return res.status(200).json(data);
  });
});

blogRoute.post("/blog/:title",authenticate, checkTitleExists("blog"), upload("blog").single("img"), (req, res) => {
  try {
    const { title, date, paraOne, paraTwo } = req.body;
    const img = req.file ? req.file.path : null;
    const ownerId = req.user.id
    if (!title || !img || !date || !paraOne) {
      return res.status(422).json({ error: "Fill/Upload all required Fields" });
    }
    //   Checking if the title is in the database
    const check = "SELECT * FROM blog WHERE title = ?";
    db.query(check, [title], function (err, data) {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ error: "Title already exists" });
      }
      const q =
        "INSERT INTO blog (img, title, date, paraOne, paraTwo, createdBy) VALUES(?,?,?,?,?,?)";
      const value = [img, title, date, paraOne, paraTwo, ownerId];
      db.query(q, value, function (err, data) {
        if (err) {
          return res.status(422).json({ error: "Error in Creating Blog " });
        }
        return res.status(201).json({ message: "Blog Created Successfully " });
      });
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

blogRoute.put("/blog/:id/:title",authenticate, checkPermission("blog","createdBy","update"),UpdatecheckTitleExists('blog'), upload("blog").single("img"), (req, res) => {
  try {
    const id = req.params.id;
    const ownerId = req.user.id
    const { title, date, paraOne, paraTwo } = req.body;
    const img = req.file ? req.file.path : null;
    if (!title || !img || !date || !paraOne) {
      return res.status(422).json({ error: "Fill/Upload all required Fields" });
    }
    // Checcking if the Blog Id Exist
    const prev = "SELECT * FROM blog WHERE id = ?";
    db.query(prev, [id], (err, data) => {
      if (err) {
        console.error("Error updating data:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length === 0) {
        return res.status(404).json({ error: "Blog Not Found" });
      }
      //   Checking if the title is in the database
    const checks = "SELECT * FROM blog WHERE title = ?";
    db.query(checks, [title], function (err, data) {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ error: "Title already exists" });
      }
      //if the new title is different from the old title then delete the previous title folder
      if (title !== data[0].title) {
        const name = data[0].title.replace(/\s+/g, "_");
        const fileName = `IBFBI/blog/${name}`;
        cloudinary.api.delete_resources_by_prefix(
          fileName,
          function (err, data) {
            if (err) {
              console.error("Cloudinary Image Deletion Error:", err);
              return res
                .status(500)
                .json({ error: "Error deleting images from Cloudinary" });
            }
            cloudinary.api.delete_folder(fileName, function (err, data) {
              if (err) {
                console.error("Cloudinary Folder Deletion Error:", err);
                return res
                  .status(500)
                  .json({ error: "Error deleting Folder from Cloudinary" });
              }
              const q =
                "UPDATE blog SET img = ?, title = ?, date = ?, paraOne = ?, paraTwo = ?,createdBy = ? WHERE id = ?";
              const values = [img, title, date, paraOne, paraTwo, ownerId, id];
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
                  .json({ message: "Blog Updated Successfully" });
              });
            });
          }
        );
      } else {
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
          const q =
            "UPDATE blog SET img = ?, title = ?, date = ?, paraOne = ?,  paraTwo = ?createdBy = ?, WHERE id = ?";
          const values = [img, title, date, paraOne, paraTwo, ownerId, id];
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
              .json({ message: "Blog Updated Successfully" });
          });
        });
      }
    })
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

blogRoute.delete("/blog/:id",authenticate, checkPermission("blog","createdBy","delete"), (req, res) => {
  const id = req.params.id;
  try {
    const q = "SELECT * FROM blog WHERE id = ?";
    db.query(q, [id], function (err, data) {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length === 0) {
        return res.status(404).json({ error: "Blog not found" });
      }
      // Delete from Cloudinary
      const name = data[0].title.replace(/\s+/g, "_");
      const fileName = `IBFBI/blog/${name}`;
      cloudinary.api.delete_resources_by_prefix(
        fileName,
        async function (err, result) {
          if (err) {
            console.error("Cloudinary Image Deletion Error:", err);
            return res
              .status(500)
              .json({ error: "Error deleting images from Cloudinary" });
          }
          cloudinary.api.delete_folder(fileName, async (error, reslt) => {
            if (error) {
              console.error("Cloudinary Folder Deletion Error:", error);
              return res
                .status(500)
                .json({ error: "Error deleting folder from Cloudinary" });
            }
            const deleteQuery = "DELETE FROM blog WHERE id = ?";
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
});

module.exports = blogRoute;
