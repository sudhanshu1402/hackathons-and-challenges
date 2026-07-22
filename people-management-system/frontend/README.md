# People Management System — Frontend

A React single-page app for managing a directory of people: CRUD, search/filter, CSV/Excel import-export, per-family views, and a reporting dashboard with charts. It's the client half of a two-part app and talks to a separate backend over a JSON API at `/api`.

This was built for a hackathon/challenge, so treat it as a working prototype rather than a hardened production product.

## What it does

- **Auth.** Username/password login against `POST /api/auth/login`. The returned JWT and user object are stored in `localStorage`. Forgot-password returns a reset token straight to the screen (a dev convenience — no email is sent), and reset-password consumes that token.
- **Role-based UI.** Two roles, `ADMIN` and `USER`. Routes are wrapped in an `AuthGuard`; the `/users` route additionally requires `ADMIN`. Admin-only actions (import, delete, bulk delete, backup/restore) are hidden for regular users.
- **People directory.** List with pagination and page-size control, name search, and filters (location, qualification, blood group, min/max age). Add/edit via an inline form; delete and bulk-delete for admins.
- **Import / export.** Export the directory to CSV or XLSX (downloaded as a blob). Admins can import a CSV/XLSX; a sample template is served at `/templates/people-template.csv`.
- **Family view.** For any person, a modal loads their family group (`GET /api/people/:id/family`) and shows the member list plus gender pie and age-spread bar charts.
- **Reports.** A dashboard (`GET /api/reports/overview`) with live-updating filters and charts for gender, age buckets, blood group, location, qualification, profession, sampraday, and marital status, plus stat cards and family clusters grouped by a "Connect serial" number.
- **Backup/restore.** Admin dashboard buttons that hit `POST /api/backup/backup` and `POST /api/backup/restore` (the backend integrates with Google Drive).

The domain leans toward a community/family directory — the `Person` type carries fields like `sampraday`, `nbSerialNumber`, `familyHeadId`, and `relation` beyond the basics.

## Stack

- React 18 + TypeScript, built with Vite 5
- React Router 6 for routing
- react-hook-form + zod for forms/validation (zod is used on the login form)
- axios for HTTP, with a request interceptor that attaches the bearer token
- recharts for charts
- Tailwind CSS 3 for styling

## Run it

Requires Node and the backend running on `http://localhost:4000` (Vite proxies `/api` there in dev).

```sh
npm install
npm run dev        # dev server (Vite)
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

There are no configured tests, linting, or CI in this project.

## API expectations

The client assumes these backend endpoints under `/api`:

| Area | Calls |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| People | `GET /people` (supports `search`, `page`, `limit`, `location`, `qualification`, `bloodGroup`, `minAge`, `maxAge`), `GET /people/:id`, `POST /people`, `PUT /people/:id`, `DELETE /people/:id`, `POST /people/bulk-delete`, `GET /people/:id/family`, `GET /people/export?format=csv\|excel`, `POST /people/import` (multipart) |
| Users | `GET /users`, `POST /users`, `DELETE /users/:id` |
| Reports | `GET /reports/overview` |
| Backup | `POST /backup/backup`, `POST /backup/restore` |

The `GET /people` handler tolerates two response shapes: a bare array, or `{ data, total, totalPages }` for paginated results.

## Configuration notes

- **Base URL** is hardcoded to `/api` in `src/api/client.ts`. In dev, `vite.config.ts` proxies that to `http://localhost:4000`. In production, put a reverse proxy (e.g. Nginx) in front to route `/api` to the backend.
- **Auth token** lives in `localStorage` under `token` (JWT) and `user` (JSON). `useAuth` hydrates from storage on load and listens for cross-tab `storage` events.
- Import expects columns: `firstName, middleName, lastName, location, qualification, bloodGroup, dateOfBirth` (dates as `YYYY-MM-DD`).

## Honest scope

- Error handling is mostly `alert()` and inline messages; no toast system or global error boundary.
- Only the login form has schema validation; the other forms rely on `required` attributes.
- The forgot-password flow surfaces the reset token in the UI, which is fine for a demo but not for real use.
- The layout is built for desktop widths.
