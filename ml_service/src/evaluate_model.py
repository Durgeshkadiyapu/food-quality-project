"""Independent re-evaluation of the saved models + diagnostics.

For every mode that has a saved model this script:
  1. re-runs the same group-aware CV for the saved model type and checks it reproduces the training metrics,
  2. breaks results down by food, class, MQ-135 saturation and quality tier,
  3. runs sensitivity ablations (no saturated rows; gas sensors only; no fruit_type),
  4. runs a cross-mode transfer diagnostic (sensor-only features): synthetic->real and real->synthetic.
Outputs reports/evaluation_report.json and reports/evaluation_report.md.
Run: python -m src.evaluate_model
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .common import (CLASSES, DATA_PREPARED, FEATURES, MODELS_DIR, MODES, NUMERIC_FEATURES, RANDOM_SEED,
                     REPORTS_DIR, load_prepared, make_xy)
from .evaluation import build_pipeline, compute_metrics, grouped_splits, oof_predict

GAS = ["MQ3_raw", "MQ135_raw"]


def _cv(mode, df, name, seed, **kw):
    X, y, g = make_xy(df)
    foods = sorted(X["fruit_type"].unique())
    X = X[[c for c in X.columns if c in (["fruit_type"] + (kw.get("numeric") or NUMERIC_FEATURES))]] if kw.get("sensor_only") is None else X
    splits = grouped_splits(mode, y, g, seed)
    pred, proba, base, fold = oof_predict(lambda: build_pipeline(name, foods, seed, **kw), X, y, splits)
    return y, pred, base


def _slice(y, pred, mask):
    mask = np.asarray(mask)
    if mask.sum() == 0:
        return None
    m = compute_metrics(y[mask], pred[mask])
    return {"n": m["n"], "accuracy": m["accuracy"], "macro_f1": m["macro_f1"],
            "per_class_recall": {c: v["recall"] for c, v in m["per_class"].items()},
            "per_class_support": {c: v["support"] for c, v in m["per_class"].items()}}


def evaluate_mode(mode, prepared, models_dir, seed):
    meta = json.loads((Path(models_dir) / mode / "metadata.json").read_text())
    name = meta["model_name"]
    df = load_prepared(mode, prepared)
    y, pred, base = _cv(mode, df, name, seed)
    y = y.to_numpy()
    full = compute_metrics(y, pred)
    out = {"mode": mode, "model": name,
           "reproduces_training_metrics": bool(abs(full["macro_f1"] - meta["evaluation"]["selected_model_metrics"]["macro_f1"]) < 1e-9),
           "metrics": full, "majority_baseline": compute_metrics(y, base), "breakdowns": {}}
    b = out["breakdowns"]
    b["by_food"] = {f: _slice(y, pred, df["food_type"].to_numpy() == f) for f in sorted(df["food_type"].unique())}
    if mode != "synthetic_demo":
        real = (~df["is_synthetic"].astype(bool)).to_numpy()
        b["real_rows_only"] = _slice(y, pred, real)
        b["real_saturated_MQ135_rows"] = _slice(y, pred, real & df["is_saturated"].astype(bool).to_numpy())
        b["real_non_saturated_rows"] = _slice(y, pred, real & ~df["is_saturated"].astype(bool).to_numpy())
        b["real_by_quality_tier"] = {t: _slice(y, pred, real & (df["quality_tier"] == t).to_numpy()) for t in "ABC"}
        if mode == "combined_demo":
            b["synthetic_rows_only"] = _slice(y, pred, ~real)

    # Sensitivity ablations (same grouped CV, same model type)
    abl = {}
    if mode == "proxy_real":
        ns = df[~df["is_saturated"].astype(bool)].reset_index(drop=True)
        yy, pp, _ = _cv(mode, ns, name, seed)
        abl["drop_saturated_rows(train+test)"] = _slice(yy.to_numpy(), pp, np.ones(len(yy), bool))
    yy, pp, _ = _cv(mode, df, name, seed, numeric=GAS)
    abl["gas_sensors_only+fruit_type(no temperature/humidity)"] = _slice(yy.to_numpy(), pp, np.ones(len(yy), bool))
    yy, pp, _ = _cv(mode, df, name, seed, sensor_only=True)
    abl["sensors_only(no fruit_type)"] = _slice(yy.to_numpy(), pp, np.ones(len(yy), bool))
    out["ablations"] = abl
    return out


def transfer_diagnostic(prepared, name_by_mode, seed):
    """Train on one origin, test on the other, using sensors only (no fruit_type)."""
    real = load_prepared("proxy_real", prepared)
    syn = load_prepared("synthetic_demo", prepared)
    res = {}
    for label, tr, te in [("synthetic->real", syn, real), ("real->synthetic", real, syn)]:
        name = name_by_mode["synthetic_demo" if tr is syn else "proxy_real"]
        Xtr, ytr, _ = make_xy(tr); Xte, yte, _ = make_xy(te)
        pipe = build_pipeline(name, sorted(Xtr["fruit_type"].unique()), seed, sensor_only=True).fit(Xtr, ytr)
        pred = pipe.predict(Xte)
        res[label] = {"model": name, **{k: v for k, v in compute_metrics(yte, pred).items() if k != "per_class"},
                      "per_class_recall": {c: compute_metrics(yte, pred)["per_class"][c]["recall"] for c in CLASSES}}
    res["note"] = ("Sensor-only diagnostic (fruit_type removed because the two sources share only Banana/Tomato and each is "
                   "single-class in the synthetic set). Low transfer means synthetic data does not reproduce the real "
                   "proxy-label structure and vice versa.")
    return res


def to_md(rep):
    L = ["# Evaluation report", "",
         "> **All labels are assumed (storage-day proxy or synthetic), never verified freshness.** Metrics below measure "
         "agreement with those assumed labels on held-out specimens/groups. They are NOT evidence of real-world freshness "
         "or food-safety prediction. Synthetic-data metrics must never be quoted as real-world performance.", ""]
    for mode, r in rep["modes"].items():
        m, bl = r["metrics"], r["majority_baseline"]
        L += [f"## Mode `{mode}` — {r['model']}", "",
              f"- Reproduces training-time CV metrics: **{r['reproduces_training_metrics']}**",
              f"- Accuracy {m['accuracy']:.3f} | macro precision {m['macro_precision']:.3f} | macro recall {m['macro_recall']:.3f} | macro F1 {m['macro_f1']:.3f} | balanced acc {m['balanced_accuracy']:.3f}",
              f"- Majority-class baseline: accuracy {bl['accuracy']:.3f}, macro F1 {bl['macro_f1']:.3f}",
              f"- Reliability: {rep['reliability'][mode]['reasons'] or 'no flagged issue'}", "",
              "| class | precision | recall | F1 | support |", "|---|---|---|---|---|"]
        L += [f"| {c} | {v['precision']:.3f} | {v['recall']:.3f} | {v['f1']:.3f} | {v['support']} |" for c, v in m["per_class"].items()]
        L += ["", "Confusion matrix (rows = true, cols = predicted; order Fresh / Semi-Fresh / Spoiled):", "", "```"]
        L += [str(row) for row in m["confusion_matrix"]["matrix"]] + ["```", "", "Breakdowns (accuracy / macro-F1 / n):", ""]
        for k, v in r["breakdowns"].items():
            if v is None: continue
            if "accuracy" in v:
                L.append(f"- {k}: acc {v['accuracy']:.3f}, F1 {v['macro_f1']:.3f}, n={v['n']}")
            else:
                for kk, vv in v.items():
                    if vv: L.append(f"- {k} / {kk}: acc {vv['accuracy']:.3f}, F1 {vv['macro_f1']:.3f}, n={vv['n']}")
        L += ["", "Ablations (same grouped CV):", ""]
        L += [f"- {k}: acc {v['accuracy']:.3f}, macro-F1 {v['macro_f1']:.3f}, n={v['n']}" for k, v in r["ablations"].items()]
        L.append("")
    if "transfer" in rep:
        L += ["## Cross-origin transfer diagnostic (sensor-only)", ""]
        for k, v in rep["transfer"].items():
            if k == "note": L.append(f"_{v}_"); continue
            L.append(f"- {k} ({v['model']}): acc {v['accuracy']:.3f}, macro-F1 {v['macro_f1']:.3f}, recall {v['per_class_recall']}")
        L.append("")
    return "\n".join(L)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prepared", default=str(DATA_PREPARED)); ap.add_argument("--models", default=str(MODELS_DIR))
    ap.add_argument("--reports", default=str(REPORTS_DIR)); ap.add_argument("--seed", type=int, default=RANDOM_SEED)
    a = ap.parse_args(argv)
    rep = {"modes": {}, "reliability": {}}
    names = {}
    for mode in MODES:
        if not (Path(a.models) / mode / "metadata.json").exists():
            print(f"skip {mode}: no saved model"); continue
        rep["modes"][mode] = evaluate_mode(mode, a.prepared, a.models, a.seed)
        meta = json.loads((Path(a.models) / mode / "metadata.json").read_text())
        rep["reliability"][mode] = meta["evaluation"]["reliability"]
        names[mode] = meta["model_name"]
        print(f"[{mode}] macroF1={rep['modes'][mode]['metrics']['macro_f1']:.3f} reproduces={rep['modes'][mode]['reproduces_training_metrics']}")
    if {"proxy_real", "synthetic_demo"} <= set(names):
        rep["transfer"] = transfer_diagnostic(a.prepared, names, a.seed)
    out = Path(a.reports); out.mkdir(parents=True, exist_ok=True)
    (out / "evaluation_report.json").write_text(json.dumps(rep, indent=2))
    (out / "evaluation_report.md").write_text(to_md(rep))
    print("wrote evaluation_report.json/.md")


if __name__ == "__main__":
    main()
