# User Management API

REST API for user CRUD with JWT auth, role-based access, CSV bulk import, and a static vanilla-JS frontend. Express 4 and MySQL via `mysql2/promise`, no ORM. Joi validates requests, bcrypt hashes passwords.

## Setup

Needs Node and a running MySQL.

```bash
npm install
```

`.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=user_management
JWT_SECRET=some-long-random-string
PORT=3000
```

The app doesn't migrate the schema. Create the table yourself (only the test suite creates it):

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  role VARCHAR(255)
);
```

## Two entry points, and they diverged

- **`server.js`** is what `npm start` runs. CORS on, serves the `public/` frontend, mounts `/users`. No Swagger, no winston.
- **`index.js`** is `main` in `package.json`. Adds winston request logging and Swagger UI at `/api-docs`, but doesn't serve the frontend or enable CORS.

They were never merged. `npm start` gets you the UI; `node index.js` gets you the docs.

## Endpoints

All under `/users`, auth as `Authorization: Bearer <token>`.

| Method | Path | Role |
|---|---|---|
| POST | `/users/login` | public |
| POST | `/users` | public, returns user + token |
| GET | `/users` | admin, paginated |
| GET | `/users/:id` | admin, user |
| PUT | `/users/:id` | admin, user, name and email only |
| DELETE | `/users/:id` | admin |
| POST | `/users/upload` | admin, CSV in a `file` field |

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"password123","role":"admin"}'

curl "http://localhost:3000/users?page=1&limit=10" -H "Authorization: Bearer <token>"
# -> {"total":42,"page":1,"limit":10,"users":[...]}
```

CSV columns are `name,email,password,role`. Rows are validated with the same Joi schema as single creates, invalid ones skipped rather than failing the batch, and the temp file is deleted afterward.

## Tests

```bash
npm test
```

Supertest suite against a **real** MySQL. It creates the `users` table in `beforeAll`, registers an admin, exercises create, read, update, delete, plus 404 and 400 cases, and drops the table in `afterAll`. Needs a live connection and the same `.env`.

## Known weaknesses

- **`POST /users` is public and accepts `role`,** so anyone can self-register as admin. That's the one to fix first.
- Two divergent server files, neither a single source of truth.
- Two bcrypt libraries installed for one job: the controller uses `bcryptjs`, the login route uses `bcrypt`.
- No refresh tokens, no rate limiting, no email-uniqueness enforced in code.

SQL is parameterized throughout, so injection isn't an issue on these paths. Good reference for wiring Express, MySQL, JWT, and Joi together. Not shippable as-is.
