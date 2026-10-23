"""Global feature-importance reports (model-supported, reproducible, no SHAP dependency).

Two views per mode, both aggregated to the ORIGINAL input features (fruit_type one-hot columns are summed):
  1. impurity/coefficient importance of the final saved model (what the fitted model split on)
  2. grouped permutation importance: drop in accuracy when one input is shuffled on HELD-OUT groups
     (fit on training folds only)

These explain what the model used. They are not evidence that a sensor causes or indicates spoilage.
SHAP is intentionally not used (not installed/verified in the build environment; permutation importance is
model-agnostic and reproducible). Run: python -m src.explain_model
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.inspection import permutation_importance

from .common import (DATA_PREPARED, FEATURES, MODELS_DIR, MODES, RANDOM_SEED, REPORTS_DIR, load_prepared,
                     make_xy)
from .evaluation import build_pipeline, grouped_splits


def _aggregate(names, values):
    agg = {f: 0.0 for f in FEATURES}
    for n, v in zip(names, values):
        base = n.split("__", 1)[1]
        key = "fruit_type" if base.startswith("fruit_type_") else base
        agg[key] += float(v)
    tot = sum(agg.values()) or 1.0
    return {k: round(v / tot, 4) for k, v in agg.items()}


def model_importance(pipe):
    clf, pre = pipe.named_steps["clf"], pipe.named_steps["pre"]
    names = list(pre.get_feature_names_out())
    if hasattr(clf, "feature_importances_"):
        return "impurity_importance", _aggregate(names, clf.feature_importances_)
    if hasattr(clf, "coef_"):  # standardised numeric inputs -> |coef| comparable; mean over classes
        return "mean_abs_coefficient", _aggregate(names, np.abs(clf.coef_).mean(axis=0))
    return "not_available", {}


def grouped_permutation(mode, meta, df, seed, n_repeats=5):
    X, y, g = make_xy(df)
    foods = sorted(X["fruit_type"].unique())
    drops = {f: [] for f in FEATURES}
    for tr, te in grouped_splits(mode, y, g, seed):
        pipe = build_pipeline(meta["model_name"], foods, seed).fit(X.iloc[tr], y.iloc[tr])
        r = permutation_importance(pipe, X.iloc[te], y.iloc[te], scoring="accuracy", n_repeats=n_repeats,
                                   random_state=seed, n_jobs=1)
        for i, f in enumerate(X.columns):
            drops[f].append(float(r.importances_mean[i]))
    return {f: {"mean_accuracy_drop": round(float(np.mean(v)), 4), "std_across_folds": round(float(np.std(v)), 4)}
            for f, v in drops.items()}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prepared", default=str(DATA_PREPARED)); ap.add_argument("--models", default=str(MODELS_DIR))
    ap.add_argument("--reports", default=str(REPORTS_DIR)); ap.add_argument("--seed", type=int, default=RANDOM_SEED)
    a = ap.parse_args(argv)
    result = {"caveat": "Shows what each model used, not scientific proof that a sensor causes or indicates spoilage. "
                        "Temperature/humidity may act as proxies for recording day/environment drift.", "modes": {}}
    for mode in MODES:
        d = Path(a.models) / mode
        if not (d / "metadata.json").exists():
            continue
        meta = json.loads((d / "metadata.json").read_text())
        pipe = joblib.load(d / "model.joblib")
        kind, imp = model_importance(pipe)
        perm = grouped_permutation(mode, meta, load_prepared(mode, a.prepared), a.seed)
        result["modes"][mode] = {"model": meta["model_name"], kind: imp, "grouped_permutation_importance": perm}
        print(mode, kind, imp, {k: v["mean_accuracy_drop"] for k, v in perm.items()})
    out = Path(a.reports); out.mkdir(parents=True, exist_ok=True)
    (out / "feature_importance.json").write_text(json.dumps(result, indent=2))
    L = ["# Feature importance", "", f"> {result['caveat']}", ""]
    for mode, r in result["modes"].items():
        L += [f"## {mode} ({r['model']})", "", "| feature | model importance | permutation accuracy drop (held-out groups) |", "|---|---|---|"]
        k = [x for x in r if x not in ("model", "grouped_permutation_importance")][0]
        for f in FEATURES:
            L.append(f"| {f} | {r[k][f]} | {r['grouped_permutation_importance'][f]['mean_accuracy_drop']} ± {r['grouped_permutation_importance'][f]['std_across_folds']} |")
        L.append("")
    (out / "feature_importance.md").write_text("\n".join(L))


if __name__ == "__main__":
    main()
