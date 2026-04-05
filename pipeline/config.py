"""Shared configuration for the ML pipeline."""
import os

# Supabase connection
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Model settings
MODEL_VERSION = "1.0.0"
TEST_SIZE = 0.20
RANDOM_STATE = 42

# Thresholds
F1_ALERT_THRESHOLD = 0.50

# Features available at inference time (no shipment/review data)
NUMERIC_FEATURES = [
    "order_subtotal",
    "shipping_fee",
    "tax_amount",
    "order_total",
    "n_line_items",
    "n_units",
    "items_revenue",
    "avg_unit_price",
    "max_unit_price",
    "min_unit_price",
    "n_distinct_products",
    "n_distinct_categories",
    "customer_age_days",
    "customer_tenure_days",
    "customer_order_count",
    "order_hour",
    "order_dow",
]

CATEGORICAL_FEATURES = [
    "payment_method",
    "device_type",
    "ip_country",
    "customer_segment",
    "loyalty_tier",
    "gender",
]

LABEL_COL = "is_fraud"
