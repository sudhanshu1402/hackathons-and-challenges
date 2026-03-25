# Student Management System

Full-stack CRUD application with Node.js, PostgreSQL, and React.js.

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)

## Setup

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE student_management;"

# Run schema
psql -U postgres -d student_management -f schema.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Edit .env if your PostgreSQL credentials differ from defaults
# Default: host=localhost, port=5432, user=postgres, password=postgres

npm start
# Server runs on http://localhost:5001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students?page=1&limit=10&search= | List students (paginated) |
| GET | /api/students/:id | Get student with marks |
| POST | /api/students | Create student |
| PUT | /api/students/:id | Update student |
| DELETE | /api/students/:id | Delete student |
| GET | /api/subjects | List all subjects |
| POST | /api/marks | Add marks |
| PUT | /api/marks/:id | Update marks |

## Postman Collection

Import `postman_collection.json` into Postman to test all API endpoints.

## Project Structure

```
student-management/
├── schema.sql                 # Database schema + seed data
├── postman_collection.json    # Postman API collection
├── backend/
│   ├── .env                   # DB connection config
│   ├── package.json
│   └── src/
│       ├── index.js           # Express server entry
│       ├── config/db.js       # PostgreSQL pool
│       └── routes/
│           ├── students.js    # Student CRUD + pagination
│           ├── subjects.js    # Subjects listing
│           └── marks.js       # Marks CRUD
└── frontend/
    ├── package.json
    └── src/
        ├── App.js
        ├── services/api.js         # Axios API service
        └── components/
            ├── StudentList.js      # Table + pagination + search
            └── StudentModal.js     # Add/Edit modal form
```
