# Library Management System

A Flask app a librarian uses to track books, members, and rentals. Submission for [Frappe's Developer Hiring Test](https://frappe.io/dev-hiring-test). Server-rendered Jinja, Bootstrap 5 via CDN, no JS frontend.

Project lives in [`Dev Hiring Test/`](./Dev%20Hiring%20Test).

## What it does

CRUD on books and members. Issue a book (fails if no copies available, otherwise decrements the count and opens a transaction). Return a book, charging `days borrowed x per-day fee`, recording what was actually paid and adding any shortfall to the member's debt. **A return is blocked if it would push that member's debt past Rs. 500.**

Import pulls from `https://frappe.io/api/method/frappe-library`, filtered by title, author, ISBN, or publisher, paging until it has the requested number of new books. Duplicate IDs are skipped and reported. Plus search over title and author, and two reports: top 5 members by spend, top 5 books by rented count.

## Data model

Three MySQL tables (see `LibraryDB.sql`): `books` with `total_quantity`, `available_quantity`, and `rented_count`; `members` with `outstanding_debt` and `amount_spent`; `transactions` with FKs to both, where an open loan has null return fields.

`LibraryTestDB.sql` is the same schema under `librarytestdb` with one seed row per table.

## Run

From inside `Dev Hiring Test/`:

```sh
pip install -r requirements.txt
export MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=yourpassword
python setupDB.py     # reads the .sql files from the current dir
python app.py         # http://127.0.0.1:5000, debug mode
```

```sh
python test.py
```

`test.py` is a `unittest` suite hitting each route through Flask's test client. It runs against `librarytestdb` and **hardcodes `MYSQL_PASSWORD = "root"`**, so edit that line if yours differs.

## Notes

- `available_quantity` is recomputed on edit as `old_available + (new_total - old_total)`, so changing total copies stays consistent with what's out on loan.
- The import reads the page count as `book["  num_pages"]`, with leading spaces. That's genuinely the key the Frappe API returns.
- SQL is parameterized, so form fields can't inject.
- The Flask session secret is hardcoded to `"secret"`, and debug mode is on. No auth, no pagination.

Hiring-test project. Complete and working as a demo of Flask, MySQL, WTForms, and a real third-party API integration.
