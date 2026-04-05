-- Create shop database schema (migrated from SQLite)

CREATE TABLE customers (
  customer_id      SERIAL PRIMARY KEY,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  gender           TEXT NOT NULL,
  birthdate        DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  city             TEXT,
  state            TEXT,
  zip_code         TEXT,
  customer_segment TEXT,
  loyalty_tier     TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
  product_id   SERIAL PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category     TEXT NOT NULL,
  price        NUMERIC NOT NULL,
  cost         NUMERIC NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE orders (
  order_id           SERIAL PRIMARY KEY,
  customer_id        INTEGER NOT NULL REFERENCES customers(customer_id),
  order_datetime     TIMESTAMPTZ NOT NULL,
  billing_zip        TEXT,
  shipping_zip       TEXT,
  shipping_state     TEXT,
  payment_method     TEXT NOT NULL,
  device_type        TEXT NOT NULL,
  ip_country         TEXT NOT NULL,
  promo_used         BOOLEAN NOT NULL DEFAULT FALSE,
  promo_code         TEXT,
  order_subtotal     NUMERIC NOT NULL,
  shipping_fee       NUMERIC NOT NULL,
  tax_amount         NUMERIC NOT NULL,
  order_total        NUMERIC NOT NULL,
  risk_score         NUMERIC NOT NULL,
  is_fraud           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE order_items (
  order_item_id  SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(order_id),
  product_id     INTEGER NOT NULL REFERENCES products(product_id),
  quantity       INTEGER NOT NULL,
  unit_price     NUMERIC NOT NULL,
  line_total     NUMERIC NOT NULL
);

CREATE TABLE shipments (
  shipment_id        SERIAL PRIMARY KEY,
  order_id           INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),
  ship_datetime      TIMESTAMPTZ NOT NULL,
  carrier            TEXT NOT NULL,
  shipping_method    TEXT NOT NULL,
  distance_band      TEXT NOT NULL,
  promised_days      INTEGER NOT NULL,
  actual_days        INTEGER NOT NULL,
  late_delivery      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE product_reviews (
  review_id       SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  product_id      INTEGER NOT NULL REFERENCES products(product_id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_datetime TIMESTAMPTZ NOT NULL,
  review_text     TEXT,
  UNIQUE(customer_id, product_id)
);

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_datetime ON orders(order_datetime);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_items_product ON order_items(product_id);
CREATE INDEX idx_shipments_late ON shipments(late_delivery);
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_customer ON product_reviews(customer_id);
