"""Main entry point: run the full nightly ML pipeline."""
import sys
import traceback
from datetime import datetime, timezone
from io import BytesIO

import joblib

from etl import run_etl
from train import train_all
from inference import run_inference
from db import upload_model


def main():
    start = datetime.now(timezone.utc)
    print(f"=== ML Pipeline Start: {start.isoformat()} ===\n")

    try:
        # Step 1: ETL — extract all tables, build training features from fulfilled orders
        df, tables = run_etl()
        print()

        # Step 2: Train all models on fulfilled orders, pick champion
        best_model, best_name, best_metrics = train_all(df)
        print()

        # Step 3: Save champion model to Supabase Storage
        print("Saving champion model to Supabase Storage...")
        buf = BytesIO()
        joblib.dump(best_model, buf)
        upload_model(buf.getvalue())
        print()

        # Step 4: Inference — score only unfulfilled orders with champion
        n_scored = run_inference(best_model, best_name, tables)
        print()

        end = datetime.now(timezone.utc)
        elapsed = (end - start).total_seconds()
        print(f"=== Pipeline Complete: {end.isoformat()} ({elapsed:.1f}s) ===")
        print(f"    Champion: {best_name}")
        print(f"    PR-AUC: {best_metrics['pr_auc']:.4f}")
        print(f"    Orders scored: {n_scored}")

    except Exception as e:
        print(f"\n!!! Pipeline FAILED: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
