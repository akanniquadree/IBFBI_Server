const express = require("express");
const db = require("../Config/Db_Config");
const { authenticate, checkPermission } = require("../Config/Auth");

const galleryCatRouter = express.Router();

// Get all program
galleryCatRouter.get("/gallerycat", (req, res) => {
  try {
    db.query("SELECT * FROM galleryCat", function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ err, error: "Error in getting Gallery Category" });
      }
      return res.status(200).json(data);
    });
  } catch (error) {
    return res.status(500).json("Internal Error");
  }
});

//Get a particular Gallery Category
galleryCatRouter.get("/gallerycat/:id", (req, res) => {
  try {
    const id = req.params.id;
    const q = "SELECT * FROM galleryCat WHERE id = ? ";
    const value = [id];
    db.query(q, value, function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ err, error: "Error in getting Gallery Category" });
      }
      return res.status(200).json(data);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

//Update a  Gallery Category
galleryCatRouter.put("/gallerycat/:id",authenticate,checkPermission('galleryCat','createdBy','update'),(req, res) => {
  const id = req.params.id;
  const ownerId = req.user
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(422).json({ error: "Fill all required Fields" });
    }

    const q = "UPDATE galleryCat SET title = ?, createdBy = ? WHERE id = ? ";
    const value = [title,ownerId,id];
    db.query(q, value, function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ err, error: "Error in saving Gallery Category" });
      }
      if (data.affectedRows === 0) {
        return res.status(404).json({ error: "Gallery Category not found" });
      }
      return res
        .status(201)
        .json({ message: "Gallery Category Updated Successfully" });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

//Create a  Gallery Category
galleryCatRouter.post("/gallerycat",authenticate, (req, res) => {
  try {
    const { title } = req.body;
    const ownerId = req.user
    if (!title) {
      return res.status(422).json({ error: "Fill all required Fields" });
    }
    // Check if the title exist in the database
    const check = "SELECT * FROM galleryCat WHERE title = ?";
    db.query(check, [title], function (err, data) {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ error: "Category already exists" });
      }

      // if it doesnt exist the save

      const q = "INSERT INTO galleryCat (title, createdBy) VALUES (?,?) ";
      const value = [title, ownerId];
      db.query(q, value, function (err, data) {
        if (err) {
          return res
            .status(404)
            .json({ err, error: "Error in saving Gallery Category" });
        }
        return res
          .status(201)
          .json({ message: "Gallery Category Created Successfully" });
      });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

galleryCatRouter.delete("/gallerycat/:id",authenticate,checkPermission('galleryCat','createdBy','delete'), async (req, res) => {
  const id = req.params.id;
  try {
    const deleteQuery = "DELETE FROM galleryCat WHERE id = ?";
    db.query(deleteQuery, [id], (errrr, data) => {
      if (errrr) {
        console.error("Database Deletion Error:", errrr);
        return res.status(500).json({ error: "Error deleting from database" });
      }
      if (data.affectedRows === 0) {
        return res.status(404).json({ error: "Gallery Category not found" });
      }
      return res
        .status(200)
        .json({ message: "Gallery Category deleted successfully" });
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = galleryCatRouter;
