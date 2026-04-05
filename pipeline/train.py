"""Train multiple models, evaluate, pick the champion, log everything."""
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import f1_score, average_precision_score, roc_auc_score, accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    AdaBoostClassifier,
    BaggingClassifier,
)
from sklearn.neighbors import KNeighborsClassifier

from config import (
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, LABEL_COL,
    MODEL_VERSION, TEST_SIZE, RANDOM_STATE, F1_ALERT_THRESHOLD,
)
from db import insert_rows

# Try to import xgboost; skip if not available
try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


def build_preprocessor():
    """Create the ColumnTransformer for numeric + categorical features."""
    numeric_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, NUMERIC_FEATURES),
            ("cat", categorical_pipe, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def get_candidate_models() -> dict[str, object]:
    """Return a dict of model_name -> estimator."""
    models = {
        "LogisticRegression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE),
        "DecisionTree_d3": DecisionTreeClassifier(max_depth=3, class_weight="balanced", random_state=RANDOM_STATE),
        "KNN_k15": KNeighborsClassifier(n_neighbors=15),
        "RandomForest": RandomForestClassifier(n_estimators=300, class_weight="balanced", n_jobs=-1, random_state=RANDOM_STATE),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=3, random_state=RANDOM_STATE
        ),
        "AdaBoost": AdaBoostClassifier(
            estimator=DecisionTreeClassifier(max_depth=1),
            n_estimators=200, learning_rate=0.5, random_state=RANDOM_STATE,
        ),
        "Bagging_d3": BaggingClassifier(
            estimator=DecisionTreeClassifier(max_depth=3, class_weight="balanced"),
            n_estimators=200, n_jobs=-1, random_state=RANDOM_STATE,
        ),
    }
    if HAS_XGB:
        # Compute scale_pos_weight for XGBoost (ratio of negative to positive)
        models["XGBoost"] = XGBClassifier(
            objective="binary:logistic", eval_metric="logloss",
            n_estimators=500, learning_rate=0.05, max_depth=3,
            subsample=0.8, colsample_bytree=0.8, reg_lambda=1.0,
            n_jobs=-1, random_state=RANDOM_STATE,
        )
    return models


def evaluate_model(model, X_test, y_test) -> dict:
    """Compute metrics on the test set."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred, pos_label=True)),
        "pr_auc": float(average_precision_score(y_test, y_prob)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
    }


def train_all(df: pd.DataFrame) -> tuple[Pipeline, str, dict]:
    """
    Train all candidate models, evaluate each, log metrics,
    return (best_pipeline, best_name, best_metrics).
    """
    # Prepare X, y
    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    available = [c for c in feature_cols if c in df.columns]
    missing = set(feature_cols) - set(available)
    if missing:
        print(f"  WARNING: Missing features (will be NaN): {missing}")

    X = df[available].copy()
    y = df[LABEL_COL].astype(bool)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"  Train: {len(X_train)} rows, Test: {len(X_test)} rows")
    print(f"  Fraud rate: {y.mean():.3f}")

    preprocessor = build_preprocessor()
    candidates = get_candidate_models()

    # Set XGBoost scale_pos_weight based on actual class imbalance
    if HAS_XGB and "XGBoost" in candidates:
        neg = (y_train == False).sum()
        pos = (y_train == True).sum()
        if pos > 0:
            candidates["XGBoost"].set_params(scale_pos_weight=neg / pos)

    results = []
    best_score = -1
    best_pipeline = None
    best_name = None
    best_metrics = None

    now_str = datetime.now(timezone.utc).isoformat()

    for name, clf in candidates.items():
        print(f"  Training {name}...")
        pipe = Pipeline([
            ("prep", preprocessor),
            ("clf", clf),
        ])
        pipe.fit(X_train, y_train)
        metrics = evaluate_model(pipe, X_test, y_test)
        metrics["row_count_train"] = len(X_train)
        metrics["row_count_test"] = len(X_test)

        print(f"    F1={metrics['f1']:.4f}  PR-AUC={metrics['pr_auc']:.4f}  ROC-AUC={metrics['roc_auc']:.4f}")

        # Track best by PR-AUC (better for imbalanced fraud detection)
        if metrics["pr_auc"] > best_score:
            best_score = metrics["pr_auc"]
            best_pipeline = pipe
            best_name = name
            best_metrics = metrics

        results.append({
            "trained_at": now_str,
            "model_name": name,
            "model_version": MODEL_VERSION,
            "accuracy": metrics["accuracy"],
            "f1": metrics["f1"],
            "pr_auc": metrics["pr_auc"],
            "roc_auc": metrics["roc_auc"],
            "row_count_train": metrics["row_count_train"],
            "row_count_test": metrics["row_count_test"],
            "features": available,
        })

    # Log all results to metrics_log
    print("  Logging metrics to Supabase...")
    insert_rows("metrics_log", results)

    # Update model registry: demote old champion, promote new
    from db import get_client
    client = get_client()
    client.table("model_registry").update({"is_champion": False}).eq("is_champion", True).execute()

    registry_row = {
        "model_name": best_name,
        "model_version": MODEL_VERSION,
        "trained_at": now_str,
        "accuracy": best_metrics["accuracy"],
        "f1": best_metrics["f1"],
        "pr_auc": best_metrics["pr_auc"],
        "roc_auc": best_metrics["roc_auc"],
        "features": available,
        "is_champion": True,
        "notes": f"Auto-selected champion by PR-AUC ({best_score:.4f})",
    }
    insert_rows("model_registry", [registry_row])

    print(f"\n  Champion: {best_name} (PR-AUC={best_score:.4f})")

    if best_metrics["f1"] < F1_ALERT_THRESHOLD:
        print(f"  ALERT: F1 ({best_metrics['f1']:.3f}) below threshold ({F1_ALERT_THRESHOLD})")

    return best_pipeline, best_name, best_metrics
