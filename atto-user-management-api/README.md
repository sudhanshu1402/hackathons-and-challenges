# User Management API

A Node.js + Express + MySQL REST API for managing users, with JWT auth, role-based access, CSV bulk import, and a small vanilla-JS web UI on top.

Built as a hackathon/challenge submission (the "atto" user-management challenge). The actual project lives in the [`user-management-api/`](./user-management-api) subfolder.

## What it does

- Register users and log them in, returning a signed JWT.
- CRUD on users, gated by role. Admins can list everyone and delete; regular users can read and update.
- Bulk-create users by uploading a CSV file (admin only).
- Passwords are hashed with bcrypt before they hit the database.
- Ships a static single-page frontend (`public/`) that talks to the same API — login, register, paginated user table, edit/delete buttons, CSV upload.

## Stack

- **Express 4** — HTTP server and routing
- **MySQL** via `mysql2/promise` — a connection pool, no ORM
- **jsonwebtoken** — JWTs signed with `JWT_SECRET`, 1-hour expiry
- **bcryptjs** / **bcrypt** — password hashing (both are installed; the controller uses `bcryptjs`, the login route uses `bcrypt`)
- **Joi** — request body validation
- **multer** + **csv-parser** — CSV upload handling
- **winston** — logging to console and `logs/` files
- **swagger-jsdoc** + **swagger-ui-express** — API docs
- **jest** + **supertest** — tests

## Two entry points (heads up)

The repo has two server files and they are not identical:

- **`server.js`** — what `npm start` runs. Enables CORS, serves the `public/` frontend, mounts `/users`. No Swagger, no winston.
- **`index.js`** — the `main` in `package.json`. Wires up winston logging middleware and Swagger at `/api-docs`, but does **not** serve the frontend or enable CORS.

So `npm start` gives you the frontend; running `node index.js` gives you the docs and logging. They were never merged into one. If you want everything at once you'll need to combine them.

## Setup

```bash
cd user-management-api
npm install
```

Create a `.env` in `user-management-api/`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=user_management
JWT_SECRET=some-long-random-string
```

You need a running MySQL instance with a `users` table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  role VARCHAR(255)
);
```

(The test suite creates and drops this table itself; the app does not create it on startup.)

## Run

```bash
npm start        # node server.js — API + web UI at http://localhost:3000
npm run dev      # same, via nodemon
node index.js    # alternative: adds Swagger UI at /api-docs and winston logging
```

## Endpoints

| Method | Path             | Access        | What it does                          |
|--------|------------------|---------------|---------------------------------------|
| POST   | `/users/login`   | public        | Log in, returns `{ token }`           |
| POST   | `/users`         | public        | Create a user, returns user + token   |
| GET    | `/users`         | admin         | List users, paginated                 |
| GET    | `/users/:id`     | admin, user   | Get one user                          |
| PUT    | `/users/:id`     | admin, user   | Update name/email                     |
| DELETE | `/users/:id`     | admin         | Delete a user                         |
| POST   | `/users/upload`  | admin         | Bulk-create from an uploaded CSV      |

Auth is a bearer token: `Authorization: Bearer <token>`.

## Example

Create a user (no auth needed on POST `/users`):

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"password123","role":"admin"}'
```

Log in:

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
# -> {"token":"eyJhbGci..."}
```

List users with that token:

```bash
curl http://localhost:3000/users?page=1&limit=10 \
  -H "Authorization: Bearer eyJhbGci..."
```

CSV upload expects a multipart field named `file`, with columns `name,email,password,role`. Invalid rows are skipped, valid ones inserted, and the temp file is deleted after processing.

## Tests

```bash
npm test
```

`test.js` is a supertest/jest suite covering create, list, get-by-id, update, delete, 404, and 400-on-invalid-input. It hits a **real** MySQL database — it creates the `users` table in `beforeAll` and drops it in `afterAll`, so a working DB connection and valid `.env` are required for the tests to pass.

## Notable details

- **Pagination** on `GET /users` via `?page` and `?limit`, returning `{ total, page, limit, users }`.
- **Validation** with Joi: name required, valid email, password min 6 chars, role must be `admin` or `user`. Create-user reports all errors at once (`abortEarly: false`); update requires at least one field.
- **SQL** uses parameterized queries throughout, so injection isn't an issue on these paths.
- The frontend reads the JWT payload client-side (`atob` on the middle segment) just to show the current role — it does not verify the signature, which is fine since that's the server's job.

## Honest scope

This is a learning / challenge project, not production code. A few rough edges worth knowing:

- Two divergent server files (see above); neither is the single source of truth.
- Two bcrypt libraries installed for the same purpose.
- `GET /users` returns only `id, name, email` — a plain `SELECT` with `LIMIT ?/OFFSET ?`.
- No refresh tokens, no rate limiting, no email-uniqueness constraint enforced in code (relies on the DB schema if you add one).
- `POST /users` is public, so anyone can self-register as `admin` by passing `"role":"admin"`.

Good as a reference for wiring Express + MySQL + JWT + Joi together, not for shipping as-is.
