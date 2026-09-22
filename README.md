# Hackathons & Challenges

Archived submissions for hiring tests, timed coding assessments, and one hackathon. Each folder is a self-contained project built to solve a specific prompt from a company or event, not a maintained product. Stacks vary by whatever the brief asked for.

Every subfolder has its own README with full setup and run instructions. This page is just the map.

## Projects

| Project | What it is | Stack |
|---------|------------|-------|
| [atto-user-management-api](./atto-user-management-api) | REST User Management API with JWT auth, admin/user roles, user CRUD, bulk CSV upload, and Swagger docs | Node.js, Express, MySQL, JWT, Winston, Jest |
| [browserstack-hackathon](./browserstack-hackathon) | Visual regression testing ("FashionStack Testathon") - Percy snapshots driven by Selenium/Playwright against a demo e-commerce site, run across BrowserStack's browser/device grid | Selenium WebDriver, Playwright, Percy, BrowserStack |
| [exordiom-assessment](./exordiom-assessment) | Debugging challenge: fix three regressions in an async order-processing microservice (boot crash, inventory overselling under concurrency, hung workers on failure) without rewriting it | Python 3.12, asyncio, Docker |
| [frappe-hiring-test](./frappe-hiring-test) | Library management web app for the Frappe dev hiring test - track books and quantity, members, and issue/return transactions | Flask, Jinja, MySQL |
| [funngro-assessment](./funngro-assessment) | Backend take-home: review and rewrite a payout/withdraw handler (idempotency, race safety, gateway off the request path), design a reward-points schema, and write up a production incident | TypeScript, Node.js, MongoDB, Jest |
| [people-management-system](./people-management-system) | Full-stack people directory with JWT/role-based access, people CRUD + search/filter, Excel/CSV import-export, PDF/Excel reports, and Google Drive backup/restore | TypeScript, Express, Prisma, PostgreSQL, React, Vite, Tailwind, Recharts |
| [postgres-elasticsearch-etl](./postgres-elasticsearch-etl) | Backend interview task: read orders from Postgres, transform to a fixed document schema, index into Elasticsearch (`orders_v1`) idempotently, then run a search query | Node.js, PostgreSQL, Elasticsearch, Docker Compose |
| [student-management](./student-management) | Full-stack student CRUD with paginated/searchable listing plus subjects and per-student marks | Node.js, Express, PostgreSQL, React, Bootstrap |

## How it's organized

Flat - one folder per submission. There's no shared build or common tooling; each project stands alone. `people-management-system` and `student-management` split into `backend/` and `frontend/` subfolders.

## Notes

- These are time-boxed deliverables. Scope, polish, and test coverage reflect what each prompt asked for, not production standards.
- Some briefs are reproduced verbatim inside the folders: `exordiom-assessment/instruction.md` (the QA bug report) and `postgres-elasticsearch-etl/README.md` (the candidate instructions with the required Elasticsearch schema).
- Debug artifacts under `browserstack-hackathon/` (`bs-debug-*` screenshots and page dumps) are gitignored at the repo root.
