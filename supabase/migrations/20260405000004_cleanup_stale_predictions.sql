-- Delete predictions for historical orders that are already fulfilled.
-- These were created by the first pipeline run before we added the
-- fulfilled-only inference filter. They're stale and should not appear
-- in the review/training pool UI.
DELETE FROM order_predictions_fraud
WHERE order_id IN (
  SELECT order_id FROM orders
  WHERE fulfilled = TRUE AND is_fraud_known = TRUE
);
