"""ETL: Extract data from Supabase, build a denormalized modeling table."""
import pandas as pd
from db import get_client


def extract_tables() -> dict[str, pd.DataFrame]:
    """Pull all needed tables from Supabase."""
    client = get_client()
    tables = {}
    for name in ["orders", "customers", "order_items", "products"]:
        # Paginate to get all rows (Supabase default limit is 1000)
        all_rows = []
        offset = 0
        page_size = 1000
        while True:
            resp = client.table(name).select("*").range(offset, offset + page_size - 1).execute()
            all_rows.extend(resp.data)
            if len(resp.data) < page_size:
                break
            offset += page_size
        tables[name] = pd.DataFrame(all_rows)
        print(f"  Extracted {name}: {len(tables[name])} rows")
    return tables


def build_feature_table(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Denormalize and engineer features. Only uses data available at order time."""
    orders = tables["orders"].copy()
    customers = tables["customers"].copy()
    order_items = tables["order_items"].copy()
    products = tables["products"].copy()

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
    df = orders.merge(customers[["customer_id", "full_name", "gender", "birthdate",
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

    # --- Customer order count (historical) ---
    df = df.sort_values("order_datetime")
    df["customer_order_count"] = df.groupby("customer_id").cumcount() + 1

    # --- Drop leakage column ---
    df = df.drop(columns=["risk_score"], errors="ignore")

    print(f"  Feature table built: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def run_etl() -> pd.DataFrame:
    """Full ETL pipeline."""
    print("ETL: Extracting tables from Supabase...")
    tables = extract_tables()
    print("ETL: Building feature table...")
    df = build_feature_table(tables)
    print("ETL: Done.")
    return df
