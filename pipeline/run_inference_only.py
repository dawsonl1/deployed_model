"""Run inference only using the saved champion model from Supabase Storage.
No training — just loads the model and scores unfulfilled orders.
"""
import sys
import traceback
from datetime import datetime, timezone
from io import BytesIO

import joblib

from etl import extract_tables, build_feature_table
from inference import run_inference
from db import get_client, download_model


def main():
    start = datetime.now(timezone.utc)
    print(f"=== Inference-Only Start: {start.isoformat()} ===\n")

    try:
        client = get_client()

        # Check if there are unfulfilled orders to score
        resp = client.table("orders").select("order_id", count="exact").eq("fulfilled", False).limit(1).execute()
        unfulfilled_count = resp.count if resp.count is not None else len(resp.data)

        if unfulfilled_count == 0:
            print("No unfulfilled orders to score. Done.")
            return

        print(f"{unfulfilled_count} unfulfilled orders to score.\n")

        # Get the champion model name from registry
        resp = client.table("model_registry").select("model_name, pr_auc, trained_at").eq("is_champion", True).limit(1).execute()

        if not resp.data:
            print("No champion model in registry. Run the full pipeline first.")
            sys.exit(1)

        champ = resp.data[0]
        print(f"Champion: {champ['model_name']} (PR-AUC: {champ['pr_auc']})")
        print(f"Trained: {champ['trained_at']}\n")

        # Load saved model from Supabase Storage
        print("Loading champion model from Supabase Storage...")
        model_bytes = download_model()

        if model_bytes is None:
            print("No saved model found in storage. Run the full pipeline first.")
            sys.exit(1)

        model = joblib.load(BytesIO(model_bytes))
        print(f"  Model loaded: {type(model).__name__}\n")

        # Extract tables and run inference on unfulfilled orders
        print("ETL: Extracting tables for inference...")
        tables = extract_tables()

        n_scored = run_inference(model, champ["model_name"], tables)
        print()

        end = datetime.now(timezone.utc)
        elapsed = (end - start).total_seconds()
        print(f"=== Inference Complete: {end.isoformat()} ({elapsed:.1f}s) ===")
        print(f"    Model: {champ['model_name']}")
        print(f"    Orders scored: {n_scored}")

    except Exception as e:
        print(f"\n!!! Inference FAILED: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
