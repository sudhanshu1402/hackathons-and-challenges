# Student Management — Frontend

React single-page app for managing a list of members (students): list, search, paginate, add, edit, and delete. It's the UI half of a two-part project; a separate backend serves the data over a REST API.

## What it does

One screen ("All Members") backed by a Bootstrap table:

- **List** members with server-side pagination and a per-page size selector (3, 5, 10, 25, 50, 100).
- **Search** by typing in the box — the query is passed to the API, and paging resets to page 1.
- **Add** a member via a modal form (name, email, age, optional parent id).
- **Edit** a member by clicking their name — same modal, pre-filled.
- **Delete** a member with a SweetAlert2 confirmation dialog.

Success and error feedback are SweetAlert2 toasts. Form fields use Bootstrap's native `required` validation (name, email, age are required; parent id is optional).

## Stack

Bootstrapped with Create React App (`react-scripts` 5). Nothing custom in the build config.

- React 19 (`react`, `react-dom`)
- `react-bootstrap` + `bootstrap` 5 for layout and components
- `axios` for HTTP
- `sweetalert2` for confirm/success/error dialogs
- `react-icons` (trash icon on the delete button)
- Testing Library packages are present but only the default CRA smoke test exists

## API it expects

All calls go through `src/services/api.js`, hardwired to:

```
http://localhost:5001/api
```

The backend must be running there (or edit `baseURL` in that file). Endpoints used by the UI:

| Function | Request | Notes |
|---|---|---|
| `getStudents(page, limit, search)` | `GET /students?page&limit&search` | expects `{ data: [...], pagination: { totalPages, total } }` |
| `getStudent(id)` | `GET /students/:id` | expects the student object directly |
| `createStudent(data)` | `POST /students` | |
| `updateStudent(id, data)` | `PUT /students/:id` | |
| `deleteStudent(id)` | `DELETE /students/:id` | |

`api.js` also exports `getSubjects` and `createMark` (`GET /subjects`, `POST /marks`), but no component uses them yet — leftovers from a broader schema.

A member payload looks like:

```js
{ name: "Ada Lovelace", email: "ada@example.com", age: 30, parent_id: null }
```

## Build & run

```bash
npm install
npm start      # dev server on http://localhost:3000
npm run build  # production bundle in ./build
npm test       # CRA test runner (watch mode)
```

Start the backend first, otherwise the table renders "No members found." and errors log to the console.

## Notable bits

- **Pagination window** (`renderPagination` in `StudentList.js`) shows up to 5 numbered pages centered on the current one, plus First/Prev/Next/Last, and clamps the window at both ends of the range.
- **Search + page-size changes both reset to page 1**, so you don't end up stranded on an out-of-range page.
- `fetchStudents` is wrapped in `useCallback` keyed on `page`/`limit`/`search`, and the effect re-runs whenever those change — that's the single data-fetch trigger.
- The modal is one component for both create and edit; `studentId` being set is what flips it into edit mode and triggers the pre-fill fetch.

## Scope

Practice / hackathon project. Single view, no routing, no auth, no state library — the API base URL is a hardcoded localhost string, and the HTML title is still the default "React App". It does the CRUD it sets out to do and nothing more.
