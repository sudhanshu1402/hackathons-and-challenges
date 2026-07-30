# postgres-elasticsearch-etl

A one-shot Node script that reads rows from Postgres, transforms them, and bulk-indexes them into Elasticsearch (`orders_v1`), then runs one search and exits. Backend interview take-home. No server, no CDC, no incremental sync.

## Run

```bash
docker compose up --build
```

Brings up Postgres (seeded from `db/init.sql`), Elasticsearch 8.13 single-node, then the app, gated on health checks. Running directly works too, but the script reads connection details from the environment with no local defaults:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=app PGPASSWORD=app PGDATABASE=appdb \
ELASTICSEARCH_URL=http://localhost:9200 npm start
```

## What the script gets right

- **Paginated read** with `LIMIT 500 OFFSET n` ordered by `id`, so the table never loads into memory at once.
- **Explicit index mapping** created up front, so ES doesn't auto-map `price` as a `long` when the first values happen to be whole numbers.
- **Real bulk error handling.** The ES client doesn't throw on partial failures, so the code walks the returned `items` array, logs each failed doc, and counts failures instead of reporting success.
- **`_id` set from the row id**, so re-running updates in place instead of duplicating.
- **One refresh at the end**, not per batch. Refreshing per batch would gut throughput.
- Both clients closed in a `finally`, so the process doesn't hang.

## It doesn't actually run against the seed data

Worth being blunt, since this is archived interview work. `src/index.js` and `db/init.sql` describe two different datasets.

`db/init.sql` creates `orders` with `id, customer_id, customer_name, country, total_cents, currency, status, created_at`. The script runs `SELECT id, customer_id, product_id, quantity, price FROM orders`. Those last three columns don't exist, so the query fails with a missing-column error, and the transform, mapping, and search all assume that second shape.

The original prompt asked for something different again: nested `customer.{id,name}` and `total.{amount,currency}`, an `isHighValue` flag, a 7-day date filter, and a `status = "PAID"` search. None of that is implemented.

So: a solid demonstration of ETL mechanics, and not a working pipeline. Treat it as a code sample.

## Scope

No tests (`npm test` is the default placeholder). Single script, single run, no retries or resumability.
