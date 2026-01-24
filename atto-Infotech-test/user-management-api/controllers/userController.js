const pool = require("../db");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const csv = require("csv-parser");

// Define validation schemas using Joi
const userSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().min(1).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "user").default("user"),
});

const updateUserSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
}).min(1); // At least one field is required for update

// Helper function to execute database queries
const executeQuery = async (query, params) => {
  const [result] = await pool.query(query, params);
  return result;
};

// Helper function to handle errors and send a response
const handleError = (res, err, message = "An error occurred") => {
  console.error("Error:", err);
  res.status(500).json({ message });
};

// Create a new user
const createUser = async (req, res) => {
  try {
    // Validate the request body against the user schema
    const { error } = userSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.error(
        "Validation Error:",
        error.details.map((detail) => detail.message).join(", "),
      );
      return res
        .status(400)
        .json({
          message: error.details.map((detail) => detail.message).join(", "),
        });
    }

    const { name, email, password, role } = req.body;

    // Hash the password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Insert the new user into the database
    const result = await executeQuery(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
    );
    console.log("User created with ID:", result.insertId);

    // Generate a JWT token for the new user
    const token = jwt.sign(
      { id: result.insertId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    console.log("JWT token generated");

    // Respond with the created user details (excluding password) and the token
    res.status(201).json({ id: result.insertId, name, email, role, token });
  } catch (err) {
    handleError(res, err, "Failed to create user");
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch paginated users from the database
    const users = await executeQuery(
      "SELECT id, name, email FROM users LIMIT ? OFFSET ?",
      [limit, offset],
    );
    console.log(`Fetched ${users.length} users for page ${page}`);

    // Get the total count of users for pagination metadata
    const totalResult = await executeQuery(
      "SELECT COUNT(*) as count FROM users",
    );
    const total = totalResult[0].count;
    console.log("Total users:", total);

    // Respond with the paginated users and metadata
    res.status(200).json({
      total,
      page,
      limit,
      users,
    });
  } catch (err) {
    handleError(res, err, "Failed to fetch users");
  }
};

// Get a user by ID
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch the user from the database
    const user = await executeQuery(
      "SELECT id, name, email FROM users WHERE id = ?",
      [userId],
    );

    if (user.length === 0) {
      console.log(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", user[0]);
    res.status(200).json(user[0]);
  } catch (err) {
    handleError(res, err, "Failed to fetch user");
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    // Validate the request body against the update schema
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
      console.error("Validation Error:", error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email } = req.body;
    const userId = req.params.id;

    // Update the user in the database
    const result = await executeQuery(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, userId],
    );

    if (result.affectedRows === 0) {
      console.log(`User with ID ${userId} not found for update`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`User with ID ${userId} updated successfully`);
    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    handleError(res, err, "Failed to update user");
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete the user from the database
    const result = await executeQuery("DELETE FROM users WHERE id = ?", [
      userId,
    ]);

    if (result.affectedRows === 0) {
      console.log(`User with ID ${userId} not found for deletion`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`User with ID ${userId} deleted successfully`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    handleError(res, err, "Failed to delete user");
  }
};

// Upload users from a CSV file
const uploadUsersFromCSV = async (req, res) => {
  const filePath = req.file.path;
  const users = [];

  console.log("Reading CSV file:", filePath);

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      users.push(row);
    })
    .on("end", async () => {
      try {
        for (const user of users) {
          // Validate each user row against the user schema
          const { error } = userSchema.validate(user, { abortEarly: false });
          if (error) {
            console.error(
              "Validation Error:",
              error.details.map((detail) => detail.message).join(", "),
            );
            continue; // Skip invalid rows
          }

          const { name, email, password, role } = user;
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert the valid user into the database
          await executeQuery(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, role],
          );
          console.log(`User ${email} inserted successfully`);
        }

        // Delete the uploaded CSV file after processing
        fs.unlinkSync(filePath);
        console.log("CSV file deleted after processing");

        res.status(201).json({ message: "Users uploaded successfully" });
      } catch (err) {
        handleError(res, err, "Failed to upload users");
      }
    });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadUsersFromCSV,
};
