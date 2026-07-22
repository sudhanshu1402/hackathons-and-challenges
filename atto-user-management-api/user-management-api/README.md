# User Management API

A REST API for user CRUD with JWT auth, role-based access, and a small vanilla-JS web frontend. Built with Express and MySQL as a hackathon/challenge submission (the "Atto" user-management API).

## What it does

Manages user accounts end to end:

- Register a user (public), log in to get a JWT.
- List users (paginated), fetch one, update, delete — all behind auth.
- Role gate: `admin` can list all users, delete, and bulk-upload; a `user` can only read/update.
- Bulk create users from a CSV upload (admin only).
- Passwords are hashed with bcrypt before storage; requests are validated with Joi.

There's also a static frontend in `public/` (login, register, paginated user table with edit/delete, CSV upload) that talks to the same API.

## Stack

- **Express 4** — HTTP server and routing
- **MySQL** via `mysql2/promise` — connection pool, no ORM
- **jsonwebtoken** — JWT signing/verification (1h expiry)
- **bcryptjs** / **bcrypt** — password hashing (both are in the deps; the controller uses `bcryptjs`, the login route uses `bcrypt`)
- **Joi** — request body validation
- **multer** + **csv-parser** — CSV file upload and parsing
- **winston** — JSON logging to console and `logs/` files
- **swagger-jsdoc** + **swagger-ui-express** — OpenAPI docs
- **jest** + **supertest** — integration tests

## Setup

Requires Node.js and a running MySQL instance.

```bash
npm install
```

Create a `.env` file:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=user_management
JWT_SECRET=some-long-random-string
PORT=3000
```

Create the `users` table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  role VARCHAR(255)
);
```

Run it:

```bash
npm start      # node server.js
npm run dev    # nodemon server.js
```

Server listens on `http://localhost:3000`. The frontend is served at `/`.

> Note: `npm start` runs `server.js` (serves the frontend + routes). A second entry point, `index.js`, wires up the winston request logger and Swagger UI at `/api-docs` but is not the configured start script. `package.json` also lists `main: index.js`. To get Swagger, run `node index.js` directly.

## Endpoints

All routes are mounted under `/users`.

| Method | Path            | Auth        | Role         | Description                     |
|--------|-----------------|-------------|--------------|---------------------------------|
| POST   | `/users/login`  | none        | —            | Log in, returns `{ token }`     |
| POST   | `/users`        | none        | —            | Register a user, returns token  |
| GET    | `/users`        | Bearer      | admin        | List users (paginated)          |
| GET    | `/users/:id`    | Bearer      | admin, user  | Get one user                    |
| PUT    | `/users/:id`    | Bearer      | admin, user  | Update name/email               |
| DELETE | `/users/:id`    | Bearer      | admin        | Delete a user                   |
| POST   | `/users/upload` | Bearer      | admin        | Bulk create from CSV (`file`)   |

Auth header format: `Authorization: Bearer <token>`.

## Usage example

Register (returns a token immediately):

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"password123","role":"admin"}'
```

Log in:

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"password123"}'
# -> {"token":"eyJhbGci..."}
```

List users (admin token required):

```bash
curl "http://localhost:3000/users?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
# -> {"total":42,"page":1,"limit":10,"users":[...]}
```

CSV upload expects columns `name,email,password,role` per row; invalid rows are skipped, valid ones are hashed and inserted.

## Tests

```bash
npm test
```

`test.js` runs a supertest suite against the real database: it creates the `users` table in `beforeAll`, registers an admin, logs in, then exercises create/read/update/delete plus the 404 and 400 validation cases, and drops the table in `afterAll`. It needs a live MySQL connection and the same `.env` config as the app.

## Implementation notes

- **Pagination** is done with `LIMIT ? OFFSET ?` and a separate `COUNT(*)` for total; the response carries `total`, `page`, and `limit`.
- **CSV upload** streams the file with `csv-parser`, validates each row with the same Joi schema used for single creates, skips bad rows instead of failing the batch, and deletes the temp file afterward.
- **Update** only touches `name` and `email` — it can't change password or role.
- The frontend reads the JWT payload client-side (`atob` of the token's middle segment) just to show the logged-in role; it doesn't verify anything.

## Scope

This is a learning/challenge project, not production code. A few honest caveats: registration is open and lets a caller self-assign the `admin` role; the schema is expected to exist (the app doesn't migrate it — only the test suite creates the table); and two bcrypt libraries are pulled in where one would do. Fine for the exercise, worth tightening before real use.
