# postgres-elasticsearch-etl

A one-shot Node.js script that reads rows from Postgres, transforms them, and bulk-indexes them into Elasticsearch. Originally a backend interview take-home.

## What it is

`src/index.js` is a small ETL job. It connects to Postgres, reads a table in pages, maps each row to a document, indexes the documents into an Elasticsearch index (`orders_v1`), then runs one search and prints the results. It runs once and exits — there is no server, no CDC, no incremental sync.

The whole thing is wired up with Docker Compose so `postgres`, `elasticsearch`, and the `app` come up together, with the app waiting on health checks before it starts.

## Stack

- Node.js 20 (alpine in the container)
- [`pg`](https://www.npmjs.com/package/pg) `^8.11.5` — Postgres client
- [`@elastic/elasticsearch`](https://www.npmjs.com/package/@elastic/elasticsearch) `^8.13.0` — ES client
- Postgres 16, Elasticsearch 8.13.4 (single-node, security disabled) via Docker Compose

## Run it

Everything runs through Compose. The app container gets its connection details from environment variables set in `docker-compose.yml`.

```bash
docker compose up --build
```

That starts Postgres (seeded from `db/init.sql`), Elasticsearch, then runs the ETL app once against them.

Running the script directly (`npm install && npm start`) works too, but only if you export the connection env vars yourself, since the script reads them from the environment with no local defaults:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=app PGPASSWORD=app PGDATABASE=appdb \
ELASTICSEARCH_URL=http://localhost:9200 \
npm start
```

## How the script works

- **Paginated read.** It pulls rows with `LIMIT 500 OFFSET n` ordered by `id`, so the full table is never loaded into memory at once.
- **Explicit index mapping.** Before indexing, it creates `orders_v1` with an explicit mapping (if the index doesn't already exist) so ES doesn't auto-map `price` as a `long` when values happen to be whole numbers.
- **Bulk indexing with real error handling.** Each batch goes through the ES `_bulk` API. The client doesn't throw on partial failures, so the code inspects the returned `items` array, logs each failed doc's error, and counts failures instead of silently succeeding.
- **`_id` set from the row id**, so re-running the script updates documents in place rather than creating duplicates.
- **Refresh once at the end**, not per batch — forcing a refresh on every batch would tank indexing throughput. The single refresh after all batches makes the documents queryable before the final search.
- **Clean shutdown.** Both the Postgres and Elasticsearch clients are closed in a `finally` block so the process doesn't hang open.

After indexing, it runs a `match_all` search sorted by `price` descending, prints the top 10 documents, and prints the total document count.

## Heads-up: the code and the schema don't match

Worth being honest about, since this is an archived interview piece: **`src/index.js` and `db/init.sql` describe two different datasets.**

- `db/init.sql` creates an `orders` table with columns: `id, customer_id, customer_name, country, total_cents, currency, status, created_at`.
- `src/index.js` runs `SELECT id, customer_id, product_id, quantity, price FROM orders`.

`product_id`, `quantity`, and `price` don't exist in the seeded table, so against the provided schema the query fails with a missing-column error. The transform, mapping, and search in the script all assume the second shape (product/quantity/price), not the seed data.

The original `README` in this repo (the interview prompt, now replaced by this file) asked for something different again: a nested document shape (`customer.{id,name}`, `total.{amount,currency}`, `isHighValue`), a 7-day date filter, and a `status = "PAID"` search — none of which the implementation does.

So the script is a solid demonstration of ETL mechanics (batching, bulk error handling, explicit mappings, clean teardown), but it does not run end-to-end against the seed data as-is and does not fulfil the original prompt. Treat it as a code sample, not a working pipeline.

## Files

| File | Purpose |
|------|---------|
| `src/index.js` | The ETL script |
| `db/init.sql` | Postgres schema + seed rows, mounted into the Postgres container's init dir |
| `docker-compose.yml` | Postgres + Elasticsearch + app, with health-check gating |
| `Dockerfile` | Builds the app container (`node:20-alpine`, prod deps only) |
| `package.json` | Deps and the `start` script |

## Scope

Archived take-home / challenge project. No tests (`npm test` is the default placeholder). Single script, single run, no retries or resumability.
