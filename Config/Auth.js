const jwt = require("jsonwebtoken");
const { isBlackListed } = require("./BlackList");
const db = require("./Db_Config");

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ error: "Unauthorized, Log in again" });
  }
  // Check if the token is blacklisted
  isBlackListed(token, (blacklisted) => {
    if (blacklisted) {
      return res.status(403).json({
        message: "Refresh token has been blacklisted. Please log in again.",
      });
    }

    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decode) => {
      if (err)
        return res.status(403).json({ error: "Invalid Token, Log in again" });

      req.user = decode; // Store user info in req.user
      next();
    });
  });
};

//Q.1 : Create a middleware for 3 Admins (ArcAdmin, MasterAdmin, BeginnerAdmin)
//      such that ArcAdmin can add other admins and Perform CRUD operation on all post
//      The MasterAdmin cannot add other admin but the admin can Perform CRUD operation on all post except the ArcAdmin post
//      While the BeginnerAdmin can only perform CRUD operation on his/her post

// Solution
// Create a MiddleWare for only the ArcAdmin which other Admin Cant access
const ArcAdmin = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ error: "Forbidden: No role assigned" });
  }
  if (req.user.role !== "00Arc100") {
    return res.status(401).json({
      error: "You dont have the Permission to carry out this operation",
    });
  }
  next();
};

//Create another Middleware that handles all post
/**
 * Reusable Middleware for Role-Based Update/Delete Permissions
 * @param {string} tableName - The table to check ownership (e.g., "posts", "comments", "users").
 * @param {string} ownerColumn - The column that stores the creator ID (e.g., "created_by").
 * @param {string} action - The action being performed ("update" or "delete").
 */

const checkPermission =
  (tableName, ownerColumn, action) => async (req, res, next) => {
    const userRole = req.user.role; // Get it from the authentication
    const userId = req.user.id;
    const entityId = req.params.id; // The ID of the entity
    try {
      // First check for the owner of the post
      const q = `SELECT ${ownerColumn} FROM ${tableName} WHERE id = ?`;
      db.query(q, [entityId], function (err, data) {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        if (data.length === 0) {
          return res.status(404).json({ error: `${tableName} not found` });
        }
        const entityOwnerId = data[0][ownerColumn];
        //  Step Two Apply the role based permission logic
        if(userRole === "00Arc100"){
            return next() //ArcAdmin can update or delete all post
        }
        else if(userRole === "00Mas010"){
            // MMasterAdmin can update/delete BegAdmin’s and their own entities, but NOT ArcAdmin’s
            const q2 = "SELECT id, role FROM admin WHERE id = ?"
            db.query(q2,[entityOwnerId], function(err2, ownerData){
                if(err2){
                    return res.status(500).json({ error: "Database error" });
                }
                if (data.length === 0) {
                    return res.status(404).json({ error: "Owner not found" });
                }
                const ownerRole = ownerData[0].role
                const ownerId = ownerData[0].id
                if(ownerRole === "00Arc100"){
                    return res.status(403).json({ error: `You cannot ${action} an ArcAdmin’s entity` });
                }
                if (ownerRole === "00Mas010" && userId !== ownerId) {
                    return res.status(403).json({ error: `You cannot ${action} another MasterAdmin’s post` });
                  }
                return next()
            })

        }
        else if(userRole === "00Beg001"){
            // Can delete only his/her post
            if(userId !== entityOwnerId){
                return res.status(403).json({ error: `You can only ${action} your ${tableName}` });
            }
            return next();
        }
        else{
            return res.status(403).json({ error: "Unauthorized action" });
        }
      });
    } catch (error) {
        return res.status(500).json({ error: "Server error" });
    }
  };

module.exports = { authenticate, ArcAdmin,checkPermission };
