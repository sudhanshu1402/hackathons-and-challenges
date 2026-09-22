const { Client: PgClient } = require("pg");
const { Client: EsClient } = require("@elastic/elasticsearch");

const INDEX_NAME = "orders_v1";
const BATCH_SIZE = 500;

const pg = new PgClient({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432, // env vars are always strings
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

const es = new EsClient({
  node: process.env.ELASTICSEARCH_URL,
});

// Explicit shape - no SELECT * leaking unknown columns
function transformRow(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    product_id: row.product_id,
    quantity: row.quantity,
    price: row.price,
  };
}

// Returns count of failed docs in this batch
async function bulkIndex(docs) {
  if (docs.length === 0) return 0;

  // ES bulk API requires alternating [meta, doc, meta, doc, ...]
  const operations = docs.flatMap((doc) => [
    { index: { _index: INDEX_NAME, _id: String(doc.id) } },
    doc,
  ]);

  const { errors, items } = await es.bulk({
    refresh: false, // never force refresh per batch - kills ES performance
    operations,
  });

  if (!errors) return 0;

  // bulk() never throws on partial failure - must inspect items manually
  const failed = items.filter((item) => item.index?.error);
  failed.forEach((item) =>
    console.error("ES index error:", JSON.stringify(item.index?.error))
  );

  return failed.length;
}

async function ensureIndex() {
  const exists = await es.indices.exists({ index: INDEX_NAME });
  if (exists) return;

  // Explicit mapping prevents ES auto-mapping price as long on whole numbers
  await es.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        id: { type: "keyword" },
        customer_id: { type: "keyword" },
        product_id: { type: "keyword" },
        quantity: { type: "integer" },
        price: { type: "float" },
      },
    },
  });

  console.log(`Created index: ${INDEX_NAME}`);
}

async function main() {
  try {
    console.log("Connecting to Postgres...");
    await pg.connect();

    console.log("Connecting to Elasticsearch...");
    await es.ping();

    await ensureIndex();

    // Paginate - never load full table into memory
    let offset = 0;
    let totalIndexed = 0;
    let totalFailed = 0;

    console.log("Starting ingestion...");

    while (true) {
      const { rows } = await pg.query(
        `SELECT id, customer_id, product_id, quantity, price
         FROM orders
         ORDER BY id
         LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );

      if (rows.length === 0) break;

      const docs = rows.map(transformRow);
      const failed = await bulkIndex(docs);

      totalIndexed += rows.length - failed;
      totalFailed += failed;
      offset += rows.length;

      console.log(`Processed ${offset} rows | failed so far: ${totalFailed}`);
    }

    console.log(`\nIngestion complete - indexed: ${totalIndexed}, failed: ${totalFailed}`);

    // Refresh once after all batches so documents are queryable
    await es.indices.refresh({ index: INDEX_NAME });

    // Query and print results
    const searchResult = await es.search({
      index: INDEX_NAME,
      size: 10,
      query: { match_all: {} },
      sort: [{ price: { order: "desc" } }],
    });

    console.log("\n--- Top 10 orders by price ---");
    searchResult.hits.hits.forEach((hit) => {
      console.log(JSON.stringify(hit._source, null, 2));
    });

    const total = searchResult.hits.total;
    const totalCount = typeof total === "number" ? total : total?.value ?? 0;
    console.log(`\nTotal documents in index: ${totalCount}`);

  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await pg.end();
    await es.close(); // was missing in original - prevents hanging process
  }
}

main();
