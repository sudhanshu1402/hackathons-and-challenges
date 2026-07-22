CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  customer_id  TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  country      TEXT NOT NULL,
  total_cents  INT NOT NULL,
  currency     TEXT NOT NULL,
  status       TEXT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO orders (customer_id, customer_name, country, total_cents, currency, status, created_at) VALUES
('c-100', 'Ada Lovelace', 'CY', 1299, 'EUR', 'PAID',  NOW() - INTERVAL '2 days'),
('c-101', 'Alan Turing',  'GB', 4999, 'GBP', 'PAID',  NOW() - INTERVAL '1 days'),
('c-102', 'Grace Hopper','US', 2500, 'USD', 'PENDING', NOW() - INTERVAL '5 hours'),
('c-100', 'Ada Lovelace', 'CY',  799, 'EUR', 'PAID',  NOW() - INTERVAL '2 hours'),
('c-103', 'Edsger Dijkstra','NL', 10500,'EUR','REFUNDED', NOW() - INTERVAL '3 days');
