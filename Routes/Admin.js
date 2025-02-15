const express = require("express");
const bcyrpt = require("bcryptjs");
const db = require("../Config/Db_Config");
const jwt = require("jsonwebtoken");
const { authenticate, ArcAdmin } = require("../Config/Auth");
const { addToBlacklistToken, isBlackListed } = require("../Config/BlackList");

const adminRoute = express.Router();

//Create an Admin
adminRoute.post("/admin", authenticate, ArcAdmin, (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(422).json({ error: "Please fill all require fields" });
    }
    // Check if email doesnt exist in the database
    const check = "SELECT * FROM admin WHERE email = ?";
    db.query(check, [email], async function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Database Error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ error: "Email already exists" });
      }
      // Hashed the password for security reasons
      const salt = await bcyrpt.genSalt(12);
      const hashedPassword = await bcyrpt.hash(password, salt);

      const q = "INSERT INTO admin (email, password, role) VALUES(?,?,?)";
      const values = [email, hashedPassword, role];
      db.query(q, values, function (err, data) {
        if (err) {
          return res.status(422).json({ error: "Error in creating admin" });
        }
        return res.status(201).json({ message: "Admin created successfully" });
      });
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all Dmin
adminRoute.get("/admin", (req, res) => {
  try {
    db.query("SELECT * FROM admin", function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Error in getting all admin" });
      }
      return res.status(200).json(data);
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//Update an admin
adminRoute.put("/admin/:id",authenticate, ArcAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(422).json({ error: "Please fill all require fields" });
    }
    // Check if email doesnt exist in the database
    const check = "SELECT * FROM admin WHERE email = ?";
    db.query(check, [email], async function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Database Error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ error: "Email already exists" });
      }
      // Hashed the password for security reasons
      const salt = await bcyrpt.genSalt(12);
      const hashedPassword = await bcyrpt.hash(password, salt);

      const q =
        "UPDATE admin SET email = ?, password = ?, role = ? WHERE id = ?";
      const values = [email, hashedPassword, role, id];
      db.query(q, values, function (err, data) {
        if (err) {
          return res.status(422).json({ error: "Error in updating admin" });
        }
        return res.status(201).json({ message: "Admin Updated successfully" });
      });
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login to admin dashboard
adminRoute.post("/admin-login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ error: "Please fill all require fields" });
    }
    const q = "SELECT * FROM admin WHERE email = ?";
    db.query(q, [email], async function (err, data) {
      if (err) {
        return res.status(422).json({ error: "Database Error" });
      }
      if (data.length === 0) {
        return res.status(422).json({ error: "Invalid Credentials" });
      }
      const admin = data[0];
      const comparePass = await bcyrpt.compare(password, admin.password);
      if (!comparePass)
        return res.status(422).json({ error: "Invalid credentials" });
      // Generate Web Token
      const accessToken = jwt.sign(
        {
          id: admin.id,
          role: admin.role,
        },
        process.env.JWT_ACCESS_TOKEN,
        { expiresIn: "5m" }
      );
      const refreshToken = jwt.sign(
        { id: admin.id, role: admin.role },
        process.env.JWT_REFRESH_TOKEN,
        { expiresIn: "7d" }
      );

      // Save the refresh token to the cookie
      res.cookie("refreshToken", refreshToken,{
        httpOnly: true,
        secure: true, // Only send over HTTPS
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })


      return res.status(200).json({ admin, accessToken });
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

adminRoute.delete("/admin/:id",authenticate, ArcAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const q = "DELETE FROM admin WHERE id = ?";
    db.query(q, [id], function (err, data) {
      if (err) {
        console.error("Database Deletion Error:", err);
        return res.status(500).json({ error: "Error deleting from database" });
      }
      return res.status(200).json({ message: "Admin deleted successfully" });
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin LogOut
adminRoute.post("/admin/logout", authenticate, (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const refreshToken = req.cookies.refreshToken;
    if (token) addToBlacklistToken(token);
    if (refreshToken) addToBlacklistToken(refreshToken);
    res.clearCookie("refreshToken"); // Remove refresh token from cookies
    return res.json({ message: "Logged out successfully!" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
});

// Admin refresh Token
adminRoute.route("/admin/refresh", (req, res) => {
  // Collect the refresh Token from the cookie header
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  isBlackListed(refreshToken, (blacklisted) => {
    if (blacklisted) {
      return res
        .status(403)
        .json({
          message: "Refresh token has been blacklisted. Please log in again.",
        });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN,
      function (err, user) {
        if (err) return res.status(403).json({ message: "Forbidden" });
        const accessToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_ACCESS_TOKEN,
          { expiresIn: "15m" }
        );
        return res.json({ accessToken });
      }
    );
  });
});

module.exports = adminRoute;
