-- Tables for the ML pipeline: metrics logging, model registry, and fraud predictions

CREATE TABLE metrics_log (
  log_id          SERIAL PRIMARY KEY,
  trained_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  accuracy        NUMERIC,
  f1              NUMERIC,
  pr_auc          NUMERIC,
  roc_auc         NUMERIC,
  row_count_train INTEGER,
  row_count_test  INTEGER,
  features        JSONB
);

CREATE TABLE model_registry (
  registry_id     SERIAL PRIMARY KEY,
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  trained_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accuracy        NUMERIC,
  f1              NUMERIC,
  pr_auc          NUMERIC,
  roc_auc         NUMERIC,
  features        JSONB,
  is_champion     BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT
);

CREATE TABLE order_predictions_fraud (
  order_id                 INTEGER PRIMARY KEY REFERENCES orders(order_id),
  fraud_probability        NUMERIC NOT NULL,
  predicted_fraud          BOOLEAN NOT NULL,
  model_name               TEXT NOT NULL,
  model_version            TEXT NOT NULL,
  prediction_timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_pred_prob ON order_predictions_fraud(fraud_probability DESC);
CREATE INDEX idx_metrics_log_trained ON metrics_log(trained_at);
CREATE INDEX idx_registry_champion ON model_registry(is_champion) WHERE is_champion = TRUE;
