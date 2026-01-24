const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

/**
 * Swagger configuration options.
 * Defines the API metadata, server information, and paths to API route files.
 */
const options = {
  definition: {
    openapi: "3.0.0", // OpenAPI version
    info: {
      title: "User Management API", // API title
      version: "1.0.0", // API version
      description: "A simple Express User Management API", // API description
    },
    servers: [
      {
        url: "http://localhost:3000", // Base URL for the API
        description: "Local development server",
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to API route files containing JSDoc comments
};

// Generate Swagger documentation
const specs = swaggerJsdoc(options);
console.log("Swagger documentation generated successfully.");

/**
 * Sets up Swagger UI for interactive API documentation.
 * @param {object} app - The Express application instance.
 */
module.exports = (app) => {
  // Serve Swagger UI at the /api-docs endpoint
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  console.log("Swagger UI is available at /api-docs");
};
