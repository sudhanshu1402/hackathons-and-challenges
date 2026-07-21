const express = require("express");
const cors = require("cors");
const path = require("path");
const userRoutes = require("./routes/userRoutes");

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port or default to 3000

/**
 * Middleware Setup
 * - Enable CORS for cross-origin requests.
 * - Parse incoming JSON and URL-encoded request bodies.
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
console.log("Static files served from:", path.join(__dirname, "public"));

// API routes
app.use("/users", userRoutes);
console.log("User routes mounted at /users");

/**
 * Handle the root route.
 * Serves the 'index.html' file from the 'public' directory.
 */
app.get("/", (req, res) => {
  console.log("Serving index.html for the root route");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Global error handler.
 * Logs errors and sends a 500 Internal Server Error response.
 */
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the app for testing purposes
module.exports = app;
