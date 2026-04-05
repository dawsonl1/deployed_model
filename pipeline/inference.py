"""Run inference: score only unfulfilled orders (no ground truth available)."""
from datetime import datetime, timezone

import pandas as pd

from config import NUMERIC_FEATURES, CATEGORICAL_FEATURES, MODEL_VERSION
from db import upsert_rows
from etl import build_feature_table


def run_inference(model, model_name: str, tables: dict[str, pd.DataFrame]):
    """Score unfulfilled orders and write fraud predictions to Supabase."""
    all_orders = tables["orders"]
    unfulfilled = all_orders[all_orders["fulfilled"] == False].copy()

    if unfulfilled.empty:
        print("Inference: No unfulfilled orders to score.")
        return 0

    print(f"Inference: {len(unfulfilled)} unfulfilled orders to score...")
    df = build_feature_table(unfulfilled, tables)

    if df.empty:
        print("Inference: No features built (orders may lack line items).")
        return 0

    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    available = [c for c in feature_cols if c in df.columns]
    X = df[available].copy()

    print(f"Inference: Scoring with {model_name}...")
    probs = model.predict_proba(X)[:, 1]
    preds = model.predict(X)

    now_str = datetime.now(timezone.utc).isoformat()

    rows = []
    for idx, (_, row) in enumerate(df.iterrows()):
        rows.append({
            "order_id": int(row["order_id"]),
            "fraud_probability": round(float(probs[idx]), 6),
            "predicted_fraud": bool(preds[idx]),
            "model_name": model_name,
            "model_version": MODEL_VERSION,
            "prediction_timestamp": now_str,
        })

    print(f"Inference: Writing {len(rows)} predictions to Supabase...")
    upsert_rows("order_predictions_fraud", rows)
    print(f"Inference: Done. {len(rows)} orders scored.")
    return len(rows)
