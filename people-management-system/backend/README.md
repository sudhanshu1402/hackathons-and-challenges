# People Management System, backend

REST API for a community directory built around one rich `Person` record: contact, education, profession, family lineage, plus search, reporting, spreadsheet import/export, and Google Drive backup.

Node + TypeScript, Express 4, Prisma 6 over PostgreSQL. The schema is shaped for a specific real dataset (a Gujarati community directory), so fields like `sampraday`, `nbSerialNumber`, `fario`, and `wifeMotherMaidenName` are deliberate, and the import layer maps that legacy spreadsheet's headers onto them.

## Setup

Needs Node, PostgreSQL, and `pg_dump`/`psql` on the host for backup.

```sh
npm install
cp .env.example .env
npx prisma generate && npx prisma migrate dev
npm run seed        # admin / admin123 if no admin exists
npm run dev
```

`.env` needs `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, the four `GOOGLE_*` OAuth values for Drive, `PORT`, and `NODE_ENV`.

## API

Everything is under `/api` and needs `Authorization: Bearer <token>` except the auth routes.

| Area | Routes |
|---|---|
| `/auth` | `login`, `forgot-password`, `reset-password` |
| `/users` (admin) | POST, GET, PUT `/:id`, DELETE `/:id`. Capped at 3 users total |
| `/people` | list with `search`, `location`, `qualification`, `bloodGroup`, `minAge`, `maxAge`, `page`, `limit`, `sortBy`, `sortOrder`; CRUD; `/:id/family`; `/export?format=excel\|csv`; `/import` (admin); `/bulk-delete` (admin) |
| `/reports` | `alphabetical`, `age`, `qualification`, `location`, each with `?format=excel\|pdf`; plus `overview` taking the same filters as the people list |
| `/backup` (admin) | `backup` dumps and uploads to Drive, `restore` takes `{ fileId }` |

```sh
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -s "localhost:4000/api/people?location=Surat&minAge=40&sortBy=lastName&limit=25" \
  -H "Authorization: Bearer $TOKEN"
# -> { "data": [...], "page": 1, "limit": 25, "total": 87, "totalPages": 4 }
```

## The interesting parts

- **Import is defensive.** The parsers try the project's own column headers first, then fall back to the legacy directory's ("Name (Head of family...)", "Surname", "Residing City"). Blood groups given as `1` to `8` map to `A+` through `AB-`. Header rows that slipped into the data get dropped.
- **Date parsing is aggressive.** `coerceDate` handles Excel serials, `YYYYMMDD`, `YYYY-MM-DD`, `DD/MM/YYYY`, `MM-DD-YYYY`, two-digit years, month names, and a last-resort "grab three numbers and guess" pass. Ugly, and it's what real spreadsheet data demands.
- **Import is all-or-nothing.** Every row is validated before any write; one bad row fails the whole request with a 400. Matches on name plus DOB, so re-importing updates rather than duplicates.
- **Family grouping keys off `nbSerialNumber`** (falling back to `familyHeadId`) rather than a foreign key, matching how the source data represents households.
- **Age filters** convert to a `dateOfBirth` range at query time.

## Known limitations

- **Password reset returns the token in the HTTP response** instead of emailing it.
- CORS is fully open.
- `services/report.service.ts` declares `overview` twice. The second wins, the first is dead code.
- No tests, no rate limiting, no schema validation library. Checks are hand-rolled in controllers.
- `restoreDatabase` mixes a callback-style Drive download with promises, so partial downloads aren't handled.
- Backup shells out to `pg_dump`/`psql`, so those binaries must exist and match the DB version. Uses an OAuth refresh token, not a service account.
