-- Add fulfilled flag and is_fraud_known to distinguish ground truth from unknown

ALTER TABLE orders ADD COLUMN fulfilled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN is_fraud_known BOOLEAN NOT NULL DEFAULT TRUE;

-- All existing historical orders are fulfilled with known fraud labels
UPDATE orders SET fulfilled = TRUE, is_fraud_known = TRUE;

CREATE INDEX idx_orders_fulfilled ON orders(fulfilled) WHERE fulfilled = FALSE;
