# User Management API

This project is a User Management API built with Node.js, Express, and MySQL. It provides endpoints for user authentication, authorization, and CRUD operations. The API also includes JWT-based authentication, role-based access control, and Swagger documentation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [License](#license)

## Features

- User authentication with JWT
- Role-based access control (admin and user roles)
- CRUD operations for users
- CSV upload for bulk user creation
- Swagger documentation for API endpoints
- Logging with Winston
- Error handling middleware

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/your-username/user-management-api.git
   cd user-management-api
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Set up the environment variables. Create a `.env` file in the root directory and add the following variables:

   ```env
   PORT=3000
   DB_HOST=your-database-host
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_NAME=your-database-name
   JWT_SECRET=your-jwt-secret
   ```

4. Start the server:

   ```sh
   npm start
   ```

5. For development, you can use:

   ```sh
   npm run dev
   ```

## Usage

- The API server will be running at `http://localhost:3000`.
- You can access the Swagger documentation at `http://localhost:3000/api-docs`.

## API Endpoints

### Authentication

- `POST /users/login`: Authenticate a user and get a JWT token.

### Users

- `POST /users`: Create a new user.
- `GET /users`: Get all users (admin only).
- `GET /users/:id`: Get a user by ID.
- `PUT /users/:id`: Update a user by ID.
- `DELETE /users/:id`: Delete a user by ID (admin only).
- `POST /users/upload`: Upload users from a CSV file (admin only).

## Testing

To run the tests, use the following command:

```sh
npm test
```
