"""Main entry point: run the full nightly ML pipeline."""
import sys
import traceback
from datetime import datetime, timezone

from etl import run_etl
from train import train_all
from inference import run_inference


def main():
    start = datetime.now(timezone.utc)
    print(f"=== ML Pipeline Start: {start.isoformat()} ===\n")

    try:
        # Step 1: ETL
        df = run_etl()
        print()

        # Step 2: Train all models, pick champion
        best_model, best_name, best_metrics = train_all(df)
        print()

        # Step 3: Inference with champion
        n_scored = run_inference(best_model, best_name)
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
