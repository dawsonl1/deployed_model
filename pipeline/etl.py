"""ETL: Extract data from Supabase, build denormalized feature tables."""
import pandas as pd
from db import get_client


def _paginate(client, table_name: str, filters: dict | None = None) -> pd.DataFrame:
    """Pull all rows from a Supabase table with pagination."""
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        query = client.table(table_name).select("*")
        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)
        resp = query.range(offset, offset + page_size - 1).execute()
        all_rows.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return pd.DataFrame(all_rows)


def extract_tables() -> dict[str, pd.DataFrame]:
    """Pull all needed tables from Supabase."""
    client = get_client()
    tables = {}
    for name in ["orders", "customers", "order_items", "products"]:
        tables[name] = _paginate(client, name)
        print(f"  Extracted {name}: {len(tables[name])} rows")
    return tables


def build_feature_table(orders: pd.DataFrame, tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Denormalize and engineer features for a given set of orders."""
    customers = tables["customers"].copy()
    order_items = tables["order_items"].copy()
    products = tables["products"].copy()

    # Only keep order_items for the orders we care about
    order_ids = set(orders["order_id"].tolist())
    order_items = order_items[order_items["order_id"].isin(order_ids)].copy()

    # --- Order-item rollup ---
    oi = order_items.merge(products[["product_id", "category", "is_active"]], on="product_id", how="left")
    item_rollup = oi.groupby("order_id").agg(
        n_line_items=("quantity", "count"),
        n_units=("quantity", "sum"),
        items_revenue=("line_total", "sum"),
        avg_unit_price=("unit_price", "mean"),
        max_unit_price=("unit_price", "max"),
        min_unit_price=("unit_price", "min"),
        n_distinct_products=("product_id", "nunique"),
        n_distinct_categories=("category", "nunique"),
    ).reset_index()

    # --- Customer features ---
    customers["birthdate"] = pd.to_datetime(customers["birthdate"], errors="coerce")
    customers["created_at"] = pd.to_datetime(customers["created_at"], errors="coerce")

    # --- Join ---
    df = orders.copy()
    df = df.merge(customers[["customer_id", "full_name", "gender", "birthdate",
                              "created_at", "customer_segment", "loyalty_tier"]],
                  on="customer_id", how="left")
    df = df.merge(item_rollup, on="order_id", how="left")

    # --- Time-based features (strip tz to avoid naive/aware mismatch) ---
    df["order_datetime"] = pd.to_datetime(df["order_datetime"], errors="coerce", utc=True).dt.tz_localize(None)
    df["birthdate"] = pd.to_datetime(df["birthdate"], errors="coerce").dt.tz_localize(None)
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", utc=True).dt.tz_localize(None)
    df["customer_age_days"] = (df["order_datetime"] - df["birthdate"]).dt.days
    df["customer_tenure_days"] = (df["order_datetime"] - df["created_at"]).dt.days
    df["order_hour"] = df["order_datetime"].dt.hour
    df["order_dow"] = df["order_datetime"].dt.dayofweek

    # --- Customer order count (historical, across ALL orders not just this subset) ---
    all_orders = tables["orders"].copy()
    all_orders["order_datetime"] = pd.to_datetime(all_orders["order_datetime"], errors="coerce", utc=True).dt.tz_localize(None)
    all_orders = all_orders.sort_values("order_datetime")
    all_orders["customer_order_count"] = all_orders.groupby("customer_id").cumcount() + 1
    order_count_map = all_orders.set_index("order_id")["customer_order_count"]
    df["customer_order_count"] = df["order_id"].map(order_count_map)

    # --- Drop leakage column ---
    df = df.drop(columns=["risk_score"], errors="ignore")

    print(f"  Feature table built: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def run_etl() -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    """Full ETL pipeline. Returns (training_df, tables)."""
    print("ETL: Extracting tables from Supabase...")
    tables = extract_tables()

    # Training data = fulfilled AND fraud-labeled orders only
    all_orders = tables["orders"]
    train_orders = all_orders[
        (all_orders["fulfilled"] == True) & (all_orders["is_fraud_known"] == True)
    ].copy()
    unlabeled = all_orders[(all_orders["fulfilled"] == True) & (all_orders["is_fraud_known"] == False)]
    unfulfilled = all_orders[all_orders["fulfilled"] == False]
    print(f"  Training pool (fulfilled + labeled): {len(train_orders)}")
    print(f"  Fulfilled but unlabeled (excluded): {len(unlabeled)}")
    print(f"  Unfulfilled (inference): {len(unfulfilled)}")

    print("ETL: Building training feature table...")
    df = build_feature_table(train_orders, tables)
    print("ETL: Done.")
    return df, tables
