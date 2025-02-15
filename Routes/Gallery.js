const express = require("express");
const {upload} = require("../Config/Upload_Config");
const db = require("../Config/Db_Config");
const cloudinary  = require("../Config/Cloudinary_Config");

const galleryRouter = express.Router();

// Upload Image
galleryRouter.post(
  "/gallery/:title",
  upload("Gallery").array("img"),
  (req, res) => {
    try {
      const img = req.files.map((file) => file.path);
      const catId = req.body.catId;
      if (img.length === 0) {
        return res.status(422).json({ error: "Upload atleast one Image" });
      }
      if (!catId) {
        return res
          .status(422)
          .json({
            error: "Supply the id if category you want to save the image to",
          });
      }
      const q = "INSERT INTO gallery (img, gallerycat_id) VALUES (?,?)";
      const value = [JSON.stringify(img), catId];
      db.query(q, value, function (err, data) {
        if (err) {
          return res.status(422).json({ error: "Error in Uploading Images " });
        }
        return res.status(201).json({ message: "Uploaded Successfully", img });
      });
    } catch (error) {
      return res.status(500).json(error);
    }
  }
);

// get a category and all Images associated with it
galleryRouter.get("/gallery/:id", (req, res) => {
  try {
    const id = req.params.id;
    const q =
      "SELECT * FROM galleryCat LEFT JOIN gallery ON galleryCat.id = gallery.gallerycat_id where galleryCat.id = ?";
    db.query(q, [id], function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Error in getting Images " });
      }
      return res.status(201).json(data);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

//get all images
galleryRouter.get("/gallery", (req, res) => {
  try {
    const q = "SELECT * FROM  gallery ";
    db.query(q, function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Error in getting Images " });
      }
      return res.status(201).json(data);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

// delete an image from the array
galleryRouter.delete("/gallery/:id", (req, res) => {
  try {
    const id = req.params.id;
    const url = req.body.url;
    if (!url) {
      return res.status(400).json({ error: "Image URL is required" });
    }
    const q = "SELECT * FROM gallery WHERE id = ?"
    db.query(q, [id], function(err, data){
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (data.length === 0) {
        return res.status(404).json({ error: "Images not found" });
      }
      //Delete Image from cloudinary
      const public_url = url.replace(
        /^https:\/\/res.cloudinary.com\/[^/]+\/image\/upload\/v\d+\//,
        ""
      ) // Removes base URL & version
      .replace(/\.[^/.]+$/, ""); // Removes file extension
      cloudinary.uploader.destroy(public_url, function(err){
        if (err) {
          console.error("Cloudinary Image Deletion Error:", err);
          return res
            .status(500)
            .json({ error: "Error deleting images from Cloudinary" });
        }
        // Remove it from DataBase
        const images = data[0].img
        const imgs = images.filter((file)=>file !== url)
        const q = "UPDATE gallery SET img = ? WHERE id = ?"
        const values = [JSON.stringify(imgs),id];
        db.query(q, values, function(err, result){
          if (err) {
            console.error("Error updating data:", err);
            return res.status(500).json({ error: "Database error" });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Program not found" });
          }
          return res
            .status(201)
            .json({ message: "Image deleted Successfully", imgs });
        })
      })
    })
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = galleryRouter;
