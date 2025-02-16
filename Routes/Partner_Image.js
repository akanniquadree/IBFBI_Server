const express = require("express");
const { upload, checkTitleExists } = require("../Config/Upload_Config");
const db = require("../Config/Db_Config");
const cloudinary = require("../Config/Cloudinary_Config");
const { authenticate, checkPermission } = require("../Config/Auth");

const partnerImage = express.Router();

partnerImage.get("/partnerimage", (req, res) => {
  db.query("SELECT * FROM partner_Image", function (err, data) {
    if (err) {
      console.log(err);
      return res.status(404).json({ error: err });
    }
    return res.status(200).json(data);
  });
});

partnerImage.post(
  "/partnerimage",
  authenticate,
  checkTitleExists,
  upload("partner_Image").array("img"),
  (req, res) => {
    try {
      const img = req.files.map((file) => file.path);
      const ownerId = req.user;
      if (img.length === 0) {
        return res.status(422).json({ error: "Upload atleast one Image" });
      }
      const q = "INSERT INTO partner_Image (img, createdBy) VALUES (?,?)";
      const value = [JSON.stringify(img), ownerId];
      db.query(q, value, function (err, data) {
        if (err) {
          return res.status(422).json({ error: "Error in Uploading Images " });
        }
        return res.status(201).json({ message: "Uploaded Successfully", img });
      });
    } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

partnerImage.delete(
  "/partnerimage/:id",
  authenticate,
  checkPermission("partner_Image", "createdBy", "delete"),
  (req, res) => {
    const id = req.params.id;
    const url = req.body.url;
    try {
      if (!url) {
        return res.status(400).json({ error: "Image URL is required" });
      }
      const q = "SELECT * FROM partner_Image WHERE id = ?";
      db.query(q, [id], function (err, data) {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (data.length === 0) {
          return res.status(404).json({ error: "Images not found" });
        }
        // Delete from Cloudinary
        // Check if there is image in the folder then delete
        const public_url = url
          .replace(
            /^https:\/\/res.cloudinary.com\/[^/]+\/image\/upload\/v\d+\//,
            ""
          ) // Removes base URL & version
          .replace(/\.[^/.]+$/, ""); // Removes file extension
        cloudinary.uploader.destroy(public_url, function (err, result) {
          if (err) {
            console.error("Cloudinary Image Deletion Error:", err);
            return res
              .status(500)
              .json({ error: "Error deleting images from Cloudinary" });
          }
          const images = data[0].img;
          const imgs = images.filter((file) => file !== url);
          const q = "UPDATE partner_Image SET img = ? WHERE id = ?";
          const values = [JSON.stringify(imgs), id];
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
              .json({ message: "Image deleted Successfully", imgs });
          });
        });
      });
    } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = partnerImage;
