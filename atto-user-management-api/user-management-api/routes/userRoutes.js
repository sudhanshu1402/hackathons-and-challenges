const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const router = express.Router();

/**
 * User login endpoint.
 * Authenticates a user by checking their email and password.
 * If valid, generates a JWT token for the user.
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt for email:", email);

  try {
    // Fetch the user from the database
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      console.error("Login failed: Invalid email");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    console.log("User found:", user.email);

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Login failed: Invalid password");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token for the authenticated user
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    console.log("JWT token generated for user:", user.email);

    // Respond with the token
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Other routes

/**
 * Create a new user.
 * Accessible to anyone (no authentication required).
 */
router.post("/", userController.createUser);

/**
 * Get all users.
 * Accessible only to users with the 'admin' role.
 */
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  userController.getAllUsers,
);

/**
 * Get a user by ID.
 * Accessible to users with the 'admin' or 'user' role.
 */
router.get(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "user"]),
  userController.getUserById,
);

/**
 * Update a user by ID.
 * Accessible to users with the 'admin' or 'user' role.
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "user"]),
  userController.updateUser,
);

/**
 * Delete a user by ID.
 * Accessible only to users with the 'admin' role.
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  userController.deleteUser,
);

/**
 * Upload users from a CSV file.
 * Accessible only to users with the 'admin' role.
 * Uses multer middleware to handle file uploads.
 */
router.post(
  "/upload",
  authenticateToken,
  authorizeRole(["admin"]),
  upload.single("file"),
  userController.uploadUsersFromCSV,
);

module.exports = router;
