# People Management System, frontend

React SPA for the directory: CRUD, search and filters, CSV/Excel import-export, per-family views, and a reporting dashboard with charts. Talks to the [backend](../backend) over JSON at `/api`.

React 18 + TypeScript on Vite 5, React Router 6, axios with a bearer-token request interceptor, recharts, Tailwind 3.

## Run

Needs the backend on `http://localhost:4000`, which Vite proxies `/api` to in dev.

```sh
npm install
npm run dev
npm run build
```

No tests, linting, or CI configured.

## What's in it

- **Auth.** JWT and user object in `localStorage`. `useAuth` hydrates on load and listens for cross-tab `storage` events.
- **Role-based UI.** `ADMIN` and `USER`, routes wrapped in an `AuthGuard`, `/users` requires admin. Import, delete, bulk-delete, and backup are hidden for regular users.
- **Directory.** Paginated list with page-size control, name search, filters on location, qualification, blood group, and age range. Inline add/edit form.
- **Family view.** A modal loading `GET /api/people/:id/family` with gender pie and age-spread bar charts.
- **Reports dashboard.** `GET /api/reports/overview` with live filters, charts for gender, age buckets, blood group, location, qualification, profession, sampraday, and marital status, plus family clusters grouped by Connect serial number.

`GET /people` tolerates two response shapes: a bare array, or `{ data, total, totalPages }`.

## Configuration

Base URL is hardcoded to `/api` in `src/api/client.ts`. In production, put a reverse proxy in front to route `/api` to the backend.

Import expects `firstName, middleName, lastName, location, qualification, bloodGroup, dateOfBirth` with dates as `YYYY-MM-DD`. A template is served at `/templates/people-template.csv`.

## Honest scope

- Error handling is mostly `alert()` and inline messages. No toasts, no error boundary.
- Only the login form has schema validation (zod). Everything else relies on `required` attributes.
- Forgot-password shows the reset token on screen. Dev convenience, not for real use.
- Built for desktop widths.
