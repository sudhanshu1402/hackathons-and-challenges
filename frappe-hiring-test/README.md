# Library Management System

A Flask web app a librarian uses to track books, members, and rentals. Built as the submission for [Frappe's Developer Hiring Test](https://frappe.io/dev-hiring-test).

The librarian can add and edit books and members, issue books to members, take returns and collect fees, import a book catalog from Frappe's public API, search the catalog, and see a couple of summary reports. All server-rendered HTML, no JavaScript frontend beyond Bootstrap.

The actual project lives in the [`Dev Hiring Test/`](./Dev%20Hiring%20Test) folder.

## What it does

- **Books** — list, view, add, edit, delete. Each book tracks total copies, available copies, and a rented count.
- **Members** — list, view, add, edit, delete.
- **Issue a book** — pick a book and member, set a per-day fee. Fails if no copies are available; otherwise decrements available count and opens a transaction.
- **Return a book** — charge is `days borrowed × per-day fee`. Records how much the member actually paid, adds any shortfall to their outstanding debt, and returns the copy to the shelf. A return is blocked if it would push the member's debt over Rs. 500.
- **Import books** — pulls records from `https://frappe.io/api/method/frappe-library`, filtered by title / author / ISBN / publisher, paging through results until it has imported the requested number of new books. Duplicate book IDs are skipped and reported.
- **Search** — matches books where the title or author contains the query.
- **Reports** — top 5 members by amount spent, top 5 books by rented count.

## Stack

- **Flask** — routing and templating (Jinja).
- **Flask-MySQLdb** (`flask_mysqldb`, `MySQLdb`) — DB access from the app.
- **mysql-connector-python** — used by the one-off `setupDB.py` to create the schema.
- **WTForms** — form definitions and validation.
- **requests** — calls the Frappe library API for imports.
- **MySQL** — three tables: `books`, `members`, `transactions` (transactions has FKs to the other two).
- **Bootstrap 5** — via CDN in the base layout.

See [`requirements.txt`](./Dev%20Hiring%20Test/requirements.txt).

## Data model

Defined in [`LibraryDB.sql`](./Dev%20Hiring%20Test/LibraryDB.sql):

- `books` — full book metadata plus `total_quantity`, `available_quantity`, `rented_count`.
- `members` — name, email, `registered_on`, `outstanding_debt`, `amount_spent`.
- `transactions` — `book_id`, `member_id`, `per_day_fee`, `borrowed_on`, `returned_on`, `total_charge`, `amount_paid`. An open loan has null return fields; returning fills them in.

`LibraryTestDB.sql` is the same schema under `librarytestdb` with one seed row per table, used by the test suite.

## Build & run

From inside the `Dev Hiring Test/` folder:

```sh
pip install -r requirements.txt
```

DB connection comes from environment variables (with defaults `localhost` / `root` / empty password / port 3306 / db `librarydb`). Set them to match your MySQL, e.g.:

```sh
export MYSQL_HOST=localhost
export MYSQL_USER=root
export MYSQL_PASSWORD=yourpassword
```

Create both databases and their tables (this script reads `LibraryDB.sql` and `LibraryTestDB.sql` from the current directory, so run it from inside `Dev Hiring Test/`):

```sh
python setupDB.py
```

Run the app:

```sh
python app.py
```

It starts on `http://127.0.0.1:5000` in debug mode.

## Tests

[`test.py`](./Dev%20Hiring%20Test/test.py) is a `unittest` suite hitting each route through Flask's test client — checking that pages load and that forms accept valid input and reject invalid input. It runs against `librarytestdb` and hardcodes `MYSQL_PASSWORD = "root"`, so edit that line if your MySQL uses a different password.

```sh
python test.py
```

## Notes

- The `setup` step in the original readme mentioned a `utils/` directory; there isn't one — `setupDB.py`, `app.py`, and the `.sql` files all sit together in `Dev Hiring Test/`.
- The Flask session secret key is hardcoded (`"secret"`). Fine for a demo, not for anything real.
- SQL queries are parameterized, so no injection through the form fields.
- `available_quantity` is recomputed on edit as `old_available + (new_total − old_total)`, so changing a book's total copies keeps the available count consistent with copies currently out on loan.
- Import quirk worth knowing: the code reads the page count field from the API as `book["  num_pages"]` (with leading spaces) — that matches the actual key the Frappe API returns.

## Scope

This is a hiring-test project, not a production system. No authentication, no pagination, debug mode on, single hardcoded secret. It's a complete, working CRUD app that demonstrates Flask + MySQL + WTForms and a real third-party API integration.
