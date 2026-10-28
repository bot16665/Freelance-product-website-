// The whole SQL schema. Plain .mjs so both the app and scripts/ can import it.
// Standard SQL types are used on purpose, so moving to MySQL/PostgreSQL later is easy.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  uid         TEXT PRIMARY KEY,          -- Firebase user id
  email       TEXT,
  name        TEXT,
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);

-- Store staff. (Owners listed in OWNER_EMAILS are always staff and are not stored here.)
CREATE TABLE IF NOT EXISTS sellers (
  uid         TEXT PRIMARY KEY,
  added_by    TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  brand              TEXT,
  manufacturer       TEXT,
  category           TEXT,
  purchase_date      TEXT,
  warranty_expiry    TEXT,
  status             TEXT,
  notes              TEXT,
  selling_price      REAL,               -- GST inclusive
  quantity           INTEGER,
  published          INTEGER NOT NULL DEFAULT 1,   -- 1 = shown in the store
  country_of_origin  TEXT,
  gst_rate           REAL,
  warranty           TEXT,
  packer_details     TEXT,
  main_image         TEXT,
  image_urls         TEXT,               -- JSON array of urls
  created_by         TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER
);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  order_no        TEXT NOT NULL UNIQUE,
  invoice_no      TEXT,
  status          TEXT NOT NULL,         -- Placed | Confirmed | Delivered | Cancelled
  company_name    TEXT,
  gstin           TEXT,
  email           TEXT,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  address         TEXT NOT NULL,
  notes           TEXT,
  payment_method  TEXT NOT NULL,
  total_items     INTEGER NOT NULL,
  total           REAL NOT NULL,
  buyer_id        TEXT NOT NULL,
  buyer_email     TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL,             -- no foreign key: order history must survive product deletion
  name        TEXT NOT NULL,
  brand       TEXT,
  image       TEXT,
  price       REAL NOT NULL,             -- price at the time of the order
  quantity    INTEGER NOT NULL,
  line_total  REAL NOT NULL,
  gst_rate    REAL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;
