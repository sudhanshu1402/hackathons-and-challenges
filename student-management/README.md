# Student Management System

Full-stack CRUD for students, subjects, and marks. Express + PostgreSQL API, React frontend. Coding challenge submission.

## Setup

Node 16+, PostgreSQL 12+.

```bash
psql -U postgres -c "CREATE DATABASE student_management;"
psql -U postgres -d student_management -f schema.sql

cd backend && npm install && npm start
cd frontend && npm install && npm start    # :3000
```

`backend/.env` needs `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT`. Keep `PORT=5001`: the frontend hardcodes `http://localhost:5001/api` in `src/services/api.js`, while the server falls back to 5000 if unset. That mismatch will bite you.

## Data model

Three tables in `schema.sql`, seeded with 5 subjects, 5 students, 15 marks.

- `students`: `id`, `name`, `email` (unique), `age` (checked 1 to 149), `parent_id` self-FK with `ON DELETE SET NULL`, timestamps.
- `subjects`: `id`, `name` (unique).
- `marks`: FKs to both with cascade, `marks` checked 0 to 100, unique on `(student_id, subject_id)` so a student can't have two rows for one subject.

Indexed on `marks.student_id` and `students.email`.

## API

| Method | Endpoint |
|---|---|
| GET | `/api/students?page=1&limit=10&search=` |
| GET | `/api/students/:id` (includes marks joined to subject names) |
| POST / PUT / DELETE | `/api/students`, `/api/students/:id` |
| GET | `/api/subjects` |
| POST / PUT | `/api/marks`, `/api/marks/:id` |
| GET | `/health` |

```json
{ "data": [ { "id": 5, "name": "...", "email": "...", "age": 19 } ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 } }
```

`postman_collection.json` exercises every endpoint. Postgres error codes map to HTTP: unique violations (`23505`) to 409, FK violations (`23503`) to 400.

## Known issues

- **Search is broken.** `students.js` builds `WHERE name ILIKE $1 OR created_at ILIKE $-1`, which is invalid SQL, so typing in the search box returns a 500. The list without search works. The fix is dropping the bogus `$-1` clause, and `created_at ILIKE` makes no sense against a timestamp anyway.
- **No UI for marks.** The endpoints and schema exist, but the React app only manages students. Marks only come back on `GET /api/students/:id`.
- No auth, no tests beyond the CRA default.

Challenge project. Single-user, local Postgres, hardcoded URLs and ports.
