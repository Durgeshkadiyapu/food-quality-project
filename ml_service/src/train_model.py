"""Train + save a model for one explicit training mode.

  python -m src.train_model --mode proxy_real        (default; real sensor data, proxy labels)
  python -m src.train_model --mode synthetic_demo    (synthetic demo data)
  python -m src.train_model --mode combined_demo     (explicit opt-in pooled demo)

Steps: grouped cross-validation of several candidates + majority baseline -> choose best macro-F1
-> refit on ALL rows of that mode -> save model.joblib + metadata.json under models/<mode>/.
No oversampling/augmentation is performed anywhere.
"""
from __future__ import annotations

import argparse
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn

from .common import (CLASSES, DATA_PREPARED, FEATURES, FORBIDDEN_FEATURES, MODEL_VERSION_BASE, MODELS_DIR,
                     MODES, NUMERIC_FEATURES, RANDOM_SEED, REPORTS_DIR, TARGET_COL, file_sha256,
                     load_prepared, make_xy)
from .evaluation import (MODEL_NAMES, build_pipeline, compute_metrics, grouped_splits, oof_predict,
                         per_fold_accuracy, reliability_assessment)


def train(mode: str, prepared_dir=DATA_PREPARED, models_dir=MODELS_DIR, reports_dir=REPORTS_DIR,
          seed: int = RANDOM_SEED, candidates=None, source_csv: Path | None = None) -> dict:
    if mode not in MODES:
        raise ValueError(f"mode must be one of {list(MODES)}")
    candidates = candidates or MODEL_NAMES
    df = load_prepared(mode, prepared_dir)
    X, y, groups = make_xy(df)
    assert set(y.unique()) <= set(CLASSES), "non-target label leaked into training data"
    assert not (set(X.columns) & set(FORBIDDEN_FEATURES))
    foods = sorted(X["fruit_type"].unique())

    splits = grouped_splits(mode, y, groups, seed)
    results, oof = {}, {}
    for name in candidates:
        pred, proba, base, fold = oof_predict(lambda n=name: build_pipeline(n, foods, seed), X, y, splits)
        results[name] = {**compute_metrics(y, pred), "per_fold": per_fold_accuracy(y, pred, fold, groups.to_numpy())}
        oof[name] = pred
        print(f"[{mode}] {name:24s} acc={results[name]['accuracy']:.3f} macroF1={results[name]['macro_f1']:.3f}")
    baseline = compute_metrics(y, base)
    best = max(results, key=lambda n: results[n]["macro_f1"])
    print(f"[{mode}] majority baseline acc={baseline['accuracy']:.3f} macroF1={baseline['macro_f1']:.3f}; selected: {best}")

    final = build_pipeline(best, foods, seed).fit(X, y)  # final fit on all rows of this mode
    assert list(final.classes_) == CLASSES

    out = Path(models_dir) / mode
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(final, out / "model.joblib")

    label_methods = sorted(df["label_method"].unique())
    meta = {
        "model_version": f"{MODEL_VERSION_BASE}-{mode}",
        "training_mode": mode,
        "training_mode_description": MODES[mode]["description"],
        "is_synthetic_demonstration": mode != "proxy_real",
        "uses_synthetic_data": bool(df["is_synthetic"].any()),
        "label_method": " + ".join(label_methods),
        "label_provenance_note": "Labels are assumed (proxy or synthetic), never observed/verified freshness.",
        "warning": MODES[mode]["warning"],
        "model_name": best,
        "model_class": type(final.named_steps["clf"]).__name__,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "random_seed": seed,
        "target": TARGET_COL, "classes": CLASSES,
        "features": FEATURES, "numeric_features": NUMERIC_FEATURES, "categorical_features": ["fruit_type"],
        "excluded_features": FORBIDDEN_FEATURES,
        "supported_fruit_types": foods,
        "training_ranges": {c: {"min": float(X[c].min()), "max": float(X[c].max())} for c in NUMERIC_FEATURES},
        "training_data": {
            "source_file": source_csv.name if source_csv else None,
            "source_sha256": file_sha256(source_csv) if source_csv and Path(source_csv).exists() else None,
            "prepared_datasets": MODES[mode]["datasets"],
            "rows": int(len(df)), "label_counts": y.value_counts().to_dict(),
            "rows_by_food": X["fruit_type"].value_counts().to_dict(),
            "independent_groups": int(groups.nunique()),
        },
        "evaluation": {
            "method": ("leave-one-specimen-out cross-validation (group = specimen)" if mode == "proxy_real"
                       else "StratifiedGroupKFold(5), group = specimen/generator-group; no group in train and test"),
            "selection_metric": "macro_f1 (pooled out-of-fold)",
            "selected_model_metrics": {k: v for k, v in results[best].items() if k != "per_fold"},
            "majority_baseline": baseline,
            "all_candidates_macro_f1": {n: results[n]["macro_f1"] for n in results},
            "all_candidates_accuracy": {n: results[n]["accuracy"] for n in results},
            "reliability": reliability_assessment(mode, y, groups, df),
            "caveat": ("Model was selected on the same CV folds it is scored on, so the selected score is "
                       "optimistic. Probabilities are model scores, not calibrated and NOT food-safety probabilities."),
        },
        "risk_score_definition": {
            "name": "spoilage_tendency_score",
            "formula": "100 * (0.5 * P(Semi-Fresh) + 1.0 * P(Spoiled))",
            "range": "0-100",
            "meaning": "How strongly the model's scores lean toward the Spoiled class. Demonstration only; NOT a validated food-safety risk.",
        },
        "environment": {"python": platform.python_version(), "scikit-learn": sklearn.__version__,
                        "pandas": pd.__version__, "numpy": np.__version__},
    }
    (out / "metadata.json").write_text(json.dumps(meta, indent=2))
    Path(reports_dir).mkdir(parents=True, exist_ok=True)
    (Path(reports_dir) / f"cv_results_{mode}.json").write_text(json.dumps(
        {"mode": mode, "selected": best, "candidates": results, "majority_baseline": baseline}, indent=2))
    return meta


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mode", default="proxy_real", choices=list(MODES))
    ap.add_argument("--prepared", default=str(DATA_PREPARED))
    ap.add_argument("--models", default=str(MODELS_DIR))
    ap.add_argument("--reports", default=str(REPORTS_DIR))
    ap.add_argument("--dataset", help="master CSV (only used to record its hash in metadata)")
    ap.add_argument("--seed", type=int, default=RANDOM_SEED)
    a = ap.parse_args(argv)
    try:
        from .common import resolve_master_csv
        src = resolve_master_csv(a.dataset)
    except FileNotFoundError:
        src = None
    meta = train(a.mode, a.prepared, a.models, a.reports, a.seed, source_csv=src)
    print(f"saved {Path(a.models)/a.mode} (model={meta['model_name']}, version={meta['model_version']})")


if __name__ == "__main__":
    main()
