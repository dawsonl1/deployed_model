"""Run inference only using the latest champion model from the registry.
Skips training — just scores unfulfilled orders with the existing best model.
"""
import sys
import traceback
from datetime import datetime, timezone

import joblib
import pandas as pd
from io import BytesIO

from etl import extract_tables, build_feature_table
from inference import run_inference
from config import NUMERIC_FEATURES, CATEGORICAL_FEATURES
from db import get_client
from train import build_preprocessor, get_candidate_models, train_all


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

        # Get the champion model info
        champion = client.table("model_registry").select("*").eq("is_champion", True).single().execute()

        if not champion.data:
            print("No champion model in registry. Run the full pipeline first.")
            sys.exit(1)

        champ = champion.data
        print(f"Champion: {champ['model_name']} (PR-AUC: {champ['pr_auc']})")
        print(f"Trained: {champ['trained_at']}\n")

        # We need to retrain the champion model type quickly since we don't store model files
        # (Supabase doesn't store binary artifacts — we retrain the specific champion algorithm)
        print("Rebuilding champion model from training data...")
        print("ETL: Extracting tables...")
        tables = extract_tables()

        all_orders = tables["orders"]
        train_orders = all_orders[all_orders["fulfilled"] == True].copy()
        print(f"  Training on {len(train_orders)} fulfilled orders")

        df = build_feature_table(train_orders, tables)

        feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
        available = [c for c in feature_cols if c in df.columns]
        X = df[available].copy()
        y = df["is_fraud"].astype(bool)

        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
        from config import TEST_SIZE, RANDOM_STATE

        X_train, _, y_train, _ = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )

        preprocessor = build_preprocessor()
        candidates = get_candidate_models()
        champion_name = champ["model_name"]

        if champion_name not in candidates:
            print(f"Champion model type '{champion_name}' not found. Using first available.")
            champion_name = list(candidates.keys())[0]

        clf = candidates[champion_name]

        # Set XGBoost scale_pos_weight if needed
        try:
            from xgboost import XGBClassifier
            if isinstance(clf, XGBClassifier):
                neg = (y_train == False).sum()
                pos = (y_train == True).sum()
                if pos > 0:
                    clf.set_params(scale_pos_weight=neg / pos)
        except ImportError:
            pass

        model = Pipeline([("prep", preprocessor), ("clf", clf)])
        model.fit(X_train, y_train)
        print(f"  {champion_name} retrained.\n")

        # Run inference on unfulfilled orders
        n_scored = run_inference(model, champion_name, tables)
        print()

        end = datetime.now(timezone.utc)
        elapsed = (end - start).total_seconds()
        print(f"=== Inference Complete: {end.isoformat()} ({elapsed:.1f}s) ===")
        print(f"    Model: {champion_name}")
        print(f"    Orders scored: {n_scored}")

    except Exception as e:
        print(f"\n!!! Inference FAILED: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
