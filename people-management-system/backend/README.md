# People Management System — Backend

REST API for a community/family directory. Built around a single rich `Person` record (name, contact, education, profession, family lineage, community fields) with search, reporting, spreadsheet import/export, and off-site backup to Google Drive.

The data model is shaped for a specific real-world dataset — a Gujarati community directory ("Nana Bhadia" / Connect telephone directory) — so you'll see fields like `sampraday`, `nbSerialNumber`, `fario`, and `wifeMotherMaidenName`. The import layer maps that legacy spreadsheet's column names onto the schema.

This is a hackathon-scope backend. It works end to end, but a few corners are cut for demo purposes (called out under [Known limitations](#known-limitations)).

## Stack

- Node.js + TypeScript (ES2020-ish, compiled with `tsc`)
- Express 4 for routing
- Prisma 6 ORM over PostgreSQL
- `jsonwebtoken` + `bcrypt` for auth
- `xlsx`, `csv-parse`, `pdfkit` for import/export/reports
- `googleapis` for Drive backup/restore
- `multer` for file uploads, `morgan` for request logging

## What it does

- **Auth** — username/password login issuing a JWT. Password reset via a token (see the caveat below).
- **Users** — admin-only CRUD, capped at 3 users total.
- **People** — full CRUD, plus paginated/sorted list with search and filters (name, location, qualification, blood group, age range).
- **Import** — upload a CSV or `.xlsx`; rows are normalized, validated all-or-nothing, then upserted (matched on first name + last name + date of birth).
- **Export** — download all people as Excel or CSV.
- **Reports** — alphabetical list, group-by-age, group-by-qualification, group-by-location, and an aggregated `overview` (counts by gender, blood group, location, marital status, age buckets, top families). Most reports also export to Excel or PDF.
- **Family view** — given a person, returns everyone sharing their family key (`nbSerialNumber` or `familyHeadId`) with per-family stats.
- **Backup** — `pg_dump` the database, push the `.sql` to a Google Drive folder; restore pulls a file back and pipes it into `psql`.

## Project layout

```
src/
  app.ts              Express app: middleware + route mounting
  server.ts           entry point (app.listen)
  config/env.ts       env loading + typed config
  middlewares/        auth (JWT), role guard, error handler
  routes/             one router per resource
  controllers/        request/response handling
  services/           Prisma access + business logic
  utils/              jwt, hash, csv/excel/pdf, googleDrive
prisma/
  schema.prisma       User + Person models
  seed.ts             creates default admin
  migrations/         SQL migration history
```

## Data model

Two models (see `prisma/schema.prisma`):

- **User** — `username` (unique), bcrypt `password`, `role` (`ADMIN` | `USER`), plus `resetToken` / `resetTokenExpiry`.
- **Person** — `id` and six required fields (`firstName`, `lastName`, `location`, `qualification`, `bloodGroup`, `dateOfBirth`) followed by ~50 optional fields covering contact, address, NRI status, education, profession, family lineage, mediclaim, and community-specific data. Indexed on `(lastName, firstName)`, `location`, `qualification`, `bloodGroup`, and `dateOfBirth`.

## Setup

Requires Node.js, a running PostgreSQL instance, and (for backup) `pg_dump`/`psql` on the host.

```sh
npm install
cp .env.example .env      # then fill in real values
npx prisma generate
npx prisma migrate dev
npm run seed              # creates admin / admin123 if no admin exists
```

### Environment (`.env`)

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | signing secret for tokens |
| `JWT_EXPIRES_IN` | token lifetime (default `1d`) |
| `BCRYPT_SALT_ROUNDS` | hash cost (default `12`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | OAuth creds for Drive |
| `GOOGLE_DRIVE_FOLDER_ID` | target folder for backups |
| `PORT` | HTTP port (default `4000`) |
| `NODE_ENV` | `development` / `production` |

## Run

```sh
npm run dev      # ts-node-dev, hot reload
npm run build    # tsc -> dist/
npm start        # node dist/server.js
```

## API

All routes are prefixed under `/api`. Everything except the auth routes requires an `Authorization: Bearer <token>` header. Routes marked **admin** additionally require an `ADMIN` role.

### Auth — `/api/auth`
| Method | Path | Notes |
|--------|------|-------|
| POST | `/login` | body `{ username, password }` → `{ token, user }` |
| POST | `/forgot-password` | body `{ username }` → returns reset token |
| POST | `/reset-password` | body `{ token, newPassword }` |

### Users — `/api/users` (admin)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | create user (max 3 total) |
| GET | `/` | list users |
| PUT | `/:id` | update |
| DELETE | `/:id` | delete |

### People — `/api/people`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | list with `search`, `location`, `qualification`, `bloodGroup`, `minAge`, `maxAge`, `page`, `limit`, `sortBy`, `sortOrder` |
| POST | `/` | create |
| GET | `/:id` | fetch one |
| PUT | `/:id` | update |
| DELETE | `/:id` | delete (admin) |
| GET | `/:id/family` | family members + stats |
| GET | `/export` | `?format=excel` or `?format=csv` |
| POST | `/import` | multipart `file` (admin) |
| POST | `/bulk-delete` | body `{ ids: number[] }` (admin) |

### Reports — `/api/reports`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/alphabetical` | supports `?format=excel|pdf` |
| GET | `/age` | grouped; `?format=excel|pdf` |
| GET | `/qualification` | grouped; `?format=excel|pdf` |
| GET | `/location` | grouped; `?format=excel|pdf` |
| GET | `/overview` | aggregated counts, accepts the same filters as people list |

### Backup — `/api/backup` (admin)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/backup` | dump DB and upload to Drive |
| POST | `/restore` | body `{ fileId }`, download and restore |

## Example

Log in, then list people over 40 in Surat, sorted by last name:

```sh
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -s "localhost:4000/api/people?location=Surat&minAge=40&sortBy=lastName&limit=25" \
  -H "Authorization: Bearer $TOKEN"
```

Response shape:

```json
{ "data": [ /* Person[] */ ], "page": 1, "limit": 25, "total": 87, "totalPages": 4 }
```

Import a spreadsheet (admin):

```sh
curl -X POST localhost:4000/api/people/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@people.xlsx"
```

## Implementation notes worth knowing

- **Import is defensive.** The CSV/Excel parsers (`utils/csv.ts`, `utils/excel.ts`) try the project's own column headers first, then fall back to the legacy directory's headers (e.g. "Name (Head of family...)", "Surname", "Residing City"). Blood groups given as `1`–`8` are mapped to `A+`…`AB-`. Detected header rows that slipped into the data are dropped.
- **Date parsing is aggressive.** `coerceDate` in the people controller handles Excel serial numbers, `YYYYMMDD`, `YYYY-MM-DD`, `DD/MM/YYYY`, `MM-DD-YYYY`, two-digit years, month names, and a last-resort "grab three numbers and guess the order" pass.
- **Import is transactional and idempotent-ish.** All rows are validated before any write; if any row fails validation the whole request returns 400. Existing people (same name + DOB) are updated rather than duplicated.
- **Filtering by age** converts `minAge`/`maxAge` into a `dateOfBirth` range at query time — the age math lives in `services/people.service.ts`.
- **Family grouping** keys off `nbSerialNumber` (or `familyHeadId` as fallback) rather than a foreign-key relation, matching how the source data represents households.
- **Backup** shells out to `pg_dump`/`psql`, so those binaries must exist on the host and match the DB version. It uses a Google OAuth refresh token (not a service account).

## Known limitations

- Password reset returns the token directly in the HTTP response instead of emailing it — fine for a demo, not for production.
- CORS is fully open (`cors()` with no options).
- `services/report.service.ts` declares `overview` twice; the second definition wins and the first is dead code. Worth cleaning up.
- No automated tests, no rate limiting, no input schema validation library (checks are hand-rolled in controllers).
- `restoreDatabase` mixes a callback-style Drive download with promises; it works for the demo path but isn't hardened against partial downloads.

## Deployment

Build with `npm run build` and run `dist/server.js` under a process manager (PM2 or similar) behind a reverse proxy. PostgreSQL must be reachable, and the backup feature needs `pg_dump`/`psql` available on the same host.
