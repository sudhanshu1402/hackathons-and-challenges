# Candidate Instructions (README.md)

## Setup

Start dependencies:

`docker compose up --build`

Install packages:

`npm install`

Run:

`npm start`

## Task

Implement src/index.js to do the following:

1. Read orders from Postgres.

   - Only index orders created in the last 7 days (or simply “all” if you want simpler).

2. Transform each order into an Elasticsearch document with this schema:

```
{
  orderId: string,                 // from orders.id
  customer: {
    id: string,
    name: string
  },
  country: string,
  status: string,
  total: {
    amount: number,                // total_cents / 100 (2 decimals)
    currency: string
  },
  createdAt: string,               // ISO string
  isHighValue: boolean             // amount >= 50
}

```

3. Index documents into Elasticsearch index name: orders_v1

   - Use orderId as the document \_id so re-running doesn’t create duplicates.

4. After indexing, run a search query:

   - Return all documents where status = "PAID" sorted by createdAt desc

   - Print the top 3 results to console (a readable format is fine).

### Constraints

- Keep it simple: a single script is enough.

- You can create the index with mappings if you want, but it’s not required.

- Aim for clean code and clear error handling.

### Environment (provided)

`Postgres`: localhost:5432 `user/pass/db` = app/app/appdb

`Elasticsearch`: http://localhost:9200
