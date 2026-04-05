"""Run inference: score all orders with the champion model, write predictions to Supabase."""
from datetime import datetime, timezone

import pandas as pd

from config import NUMERIC_FEATURES, CATEGORICAL_FEATURES, MODEL_VERSION
from db import get_client, upsert_rows
from etl import extract_tables, build_feature_table


def run_inference(model, model_name: str):
    """Score all orders and write fraud predictions to Supabase."""
    print("Inference: Building feature table for all orders...")
    tables = extract_tables()
    df = build_feature_table(tables)

    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    available = [c for c in feature_cols if c in df.columns]
    X = df[available].copy()

    print(f"Inference: Scoring {len(X)} orders with {model_name}...")
    probs = model.predict_proba(X)[:, 1]
    preds = model.predict(X)

    now_str = datetime.now(timezone.utc).isoformat()

    rows = []
    for i, row in df.iterrows():
        rows.append({
            "order_id": int(row["order_id"]),
            "fraud_probability": round(float(probs[i if isinstance(i, int) else 0]), 6),
            "predicted_fraud": bool(preds[i if isinstance(i, int) else 0]),
            "model_name": model_name,
            "model_version": MODEL_VERSION,
            "prediction_timestamp": now_str,
        })

    print(f"Inference: Writing {len(rows)} predictions to Supabase...")
    upsert_rows("order_predictions_fraud", rows)
    print(f"Inference: Done. {len(rows)} orders scored.")
    return len(rows)
