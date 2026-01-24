const request = require("supertest"); // HTTP assertions for testing
const express = require("express");
const pool = require("./db"); // Database connection pool
const userRoutes = require("./routes/userRoutes"); // User routes to test

// Initialize the Express app
const app = express();
app.use(express.json());
app.use("/users", userRoutes);

let token; // Variable to store the JWT token for authenticated requests

/**
 * Setup before running tests.
 * - Creates the `users` table if it doesn't exist.
 * - Registers an admin user and logs in to obtain a JWT token.
 */
beforeAll(async () => {
  // Create the `users` table
  await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            password VARCHAR(255),
            role VARCHAR(255)
        )
    `);
  console.log("Created `users` table for testing.");

  // Register an admin user
  await request(app).post("/users").send({
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  });
  console.log("Registered admin user.");

  // Log in as the admin user to get the JWT token
  const res = await request(app).post("/users/login").send({
    email: "admin@example.com",
    password: "password123",
  });

  console.log("Login Response:", res.body); // Log the login response
  token = res.body.token;
  console.log("Generated Token:", token); // Log the generated token
});

/**
 * Cleanup after running tests.
 * - Drops the `users` table.
 * - Closes the database connection pool.
 */
afterAll(async () => {
  await pool.query("DROP TABLE users");
  console.log("Dropped `users` table after testing.");
  await pool.end();
  console.log("Closed database connection pool.");
});

/**
 * Test suite for the User Management API.
 */
describe("User Management API", () => {
  /**
   * Test case: Create a new user.
   */
  it("should create a new user", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "user",
      });

    console.log("Create User Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name", "John Doe");
    expect(res.body).toHaveProperty("email", "john@example.com");
    expect(res.body).toHaveProperty("role", "user");
    expect(res.body).toHaveProperty("token");
  });

  /**
   * Test case: Retrieve all users.
   */
  it("should retrieve all users", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);

    if (res.statusCode !== 200) {
      console.error("Error retrieving users:", res.body); // Log errors
    }

    console.log("Retrieve All Users Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
  });

  /**
   * Test case: Retrieve a specific user by ID.
   */
  it("should retrieve a specific user by ID", async () => {
    const userId = 1; // Replace with a valid user ID
    const res = await request(app)
      .get(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    if (res.statusCode !== 200) {
      console.error("Error retrieving user:", res.body); // Log errors
    }

    console.log("Retrieve User by ID Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("id", userId);
    expect(res.body).toHaveProperty("name", "Admin User");
    expect(res.body).toHaveProperty("email", "admin@example.com");
  });

  /**
   * Test case: Update a user’s details.
   */
  it("should update a user’s details", async () => {
    const userId = 1; // Replace with a valid user ID
    const res = await request(app)
      .put(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Jake Smith",
        email: "jake.smith@example.com",
      });

    if (res.statusCode !== 200) {
      console.error("Error updating user:", res.body); // Log errors
    }

    console.log("Update User Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "User updated successfully");

    // Verify the updated user details
    const updatedUser = await request(app)
      .get(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(updatedUser.body).toHaveProperty("name", "Jake Smith");
    expect(updatedUser.body).toHaveProperty("email", "jake.smith@example.com");
  });

  /**
   * Test case: Delete a user.
   */
  it("should delete a user", async () => {
    const userId = 1; // Replace with a valid user ID
    const res = await request(app)
      .delete(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    if (res.statusCode !== 200) {
      console.error("Error deleting user:", res.body); // Log errors
    }

    console.log("Delete User Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "User deleted successfully");

    // Verify the user is deleted
    const deletedUser = await request(app)
      .get(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deletedUser.statusCode).toEqual(404);
  });

  /**
   * Test case: Return 404 for a non-existent user.
   */
  it("should return 404 for non-existent user", async () => {
    const res = await request(app)
      .get("/users/9999")
      .set("Authorization", `Bearer ${token}`);

    if (res.statusCode !== 404) {
      console.error("Error retrieving non-existent user:", res.body); // Log errors
    }

    console.log("Non-Existent User Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("message", "User not found");
  });

  /**
   * Test case: Return 400 for invalid user data.
   */
  it("should return 400 for invalid user data", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
        email: "invalid-email",
        password: "short",
        role: "user",
      });

    console.log("Invalid User Data Response:", res.body); // Log the response
    expect(res.statusCode).toEqual(400);
  });
});
