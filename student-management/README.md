# Student Management System

A full-stack CRUD app for managing students, subjects, and marks. Express + PostgreSQL API, React front end.

Built as a coding challenge. It covers the usual full-stack basics: a REST API over a normalized schema, a paginated/searchable table UI, modal forms with validation, and confirm dialogs.

## What it does

- List students in a paginated table with adjustable page size (3–100 rows).
- Add, edit, and delete students through a Bootstrap modal, with SweetAlert2 confirm/success/error dialogs.
- Store marks per student per subject (0–100), with a unique constraint so a student can't have two rows for the same subject.
- Fetch a single student together with all their marks joined to subject names.
- A self-referencing `parent_id` on students (a student can point at another student as parent), exposed in the form.

## Stack

**Backend**
- Node.js + Express 4
- PostgreSQL via `pg` (connection pool)
- `dotenv` for config, `cors` enabled

**Frontend**
- React 19 (Create React App / `react-scripts`)
- react-bootstrap + Bootstrap 5
- axios for API calls
- sweetalert2 for dialogs, react-icons for the delete icon

## Data model

Three tables (see `schema.sql`):

- `students` — `id`, `name`, `email` (unique), `age` (1–149, checked), `parent_id` (self-FK, `ON DELETE SET NULL`), timestamps.
- `subjects` — `id`, `name` (unique).
- `marks` — `id`, `student_id` (FK, cascade), `subject_id` (FK, cascade), `marks` (0–100, checked), unique on `(student_id, subject_id)`.

Indexes on `marks.student_id` and `students.email`. The schema seeds 5 subjects, 5 students, and 15 marks rows.

## Setup

Prerequisites: Node.js 16+ and PostgreSQL 12+.

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE student_management;"
psql -U postgres -d student_management -f schema.sql
```

### 2. Backend

```bash
cd backend
npm install
npm start        # or: npm run dev  (node --watch)
```

Configure `backend/.env` to match your Postgres setup:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=student_management
PORT=5001
```

The server reads `PORT` from `.env` (falls back to 5000 if unset). The front end expects it on **5001**, so keep `PORT=5001` unless you also change the front-end base URL.

### 3. Frontend

```bash
cd frontend
npm install
npm start        # http://localhost:3000
```

The API base URL is hard-coded to `http://localhost:5001/api` in `frontend/src/services/api.js`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students?page=1&limit=10&search=` | List students, paginated |
| GET | `/api/students/:id` | Get one student with marks |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| GET | `/api/subjects` | List all subjects |
| POST | `/api/marks` | Add a mark |
| PUT | `/api/marks/:id` | Update a mark |
| GET | `/health` | `{ status: "ok" }` |

`GET /api/students` returns:

```json
{
  "data": [ { "id": 5, "name": "...", "email": "...", "age": 19 } ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

Import `postman_collection.json` into Postman to exercise every endpoint.

### Error handling

Routes map Postgres error codes to HTTP status: unique violations (`23505`) → 409, FK violations (`23503`) → 400. Marks are range-checked (0–100) before insert/update, on top of the DB `CHECK`.

## Project structure

```
student-management/
├── schema.sql                  # tables, indexes, seed data
├── postman_collection.json
├── backend/
│   ├── .env                    # DB + PORT config
│   └── src/
│       ├── index.js            # Express entry
│       ├── config/db.js        # pg Pool
│       └── routes/
│           ├── students.js     # CRUD + pagination
│           ├── subjects.js     # list
│           └── marks.js        # create/update
└── frontend/
    └── src/
        ├── App.js
        ├── services/api.js     # axios wrappers
        └── components/
            ├── StudentList.js  # table, pagination, search box
            └── StudentModal.js # add/edit form
```

## Known issues

- **Search is broken.** In `students.js` the search branch builds `WHERE name ILIKE $1 OR created_at ILIKE $-1`, which is invalid SQL. Typing in the search box returns a 500. The list without search works fine. Fixing it means dropping the bogus `$-1` clause (and `created_at ILIKE` doesn't make sense against a timestamp anyway).
- There's no UI for adding/editing marks — the marks endpoints exist and are covered by the schema, but the React app only manages students. Marks come back on `GET /api/students/:id`.
- No auth, no tests beyond the CRA default `App.test.js`.

## Scope

Challenge/practice project, not production. No authentication, minimal validation, single-user, local Postgres. The API base URL and port assumptions are hard-coded rather than configured.
