require("dotenv").config();
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const logger = require("./logger");
const swaggerDocs = require("./swagger");

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

/**
 * Logging middleware.
 * Logs all incoming requests with their method and URL.
 */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Use user routes
app.use("/users", userRoutes);

// Set up Swagger API documentation
swaggerDocs(app);

/**
 * Error handling middleware.
 * Logs errors and sends a generic error response to the client.
 */
app.use((err, req, res, next) => {
  logger.error("Error:", err.stack); // Log the full error stack trace
  res.status(500).json({ message: "Something went wrong!" }); // Send a generic error response
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
