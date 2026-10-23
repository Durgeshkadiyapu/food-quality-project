"""Shared model-building and grouped-evaluation helpers (no I/O)."""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import LeaveOneGroupOut, StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .common import CATEGORICAL_FEATURES, CLASSES, NUMERIC_FEATURES, RANDOM_SEED

MODEL_NAMES = ["logistic_regression", "random_forest", "extra_trees", "hist_gradient_boosting"]


def build_pipeline(name: str, foods: list[str], seed: int = RANDOM_SEED, sensor_only: bool = False,
                   numeric: list[str] | None = None) -> Pipeline:
    """Preprocessing + classifier in ONE sklearn Pipeline (so they are saved together).

    - Median imputer is fitted on training data only. The API rejects missing values, so it never
      fills real requests; it exists so offline CV cannot crash on a stray NaN.
    - Scaling only for logistic regression (trees do not need it).
    - OneHotEncoder categories are fixed up-front and unknown foods RAISE (no silent handling).
    - Class balancing = class_weight inside the learner (training rows only; no resampling).
    """
    num_steps = [("impute", SimpleImputer(strategy="median"))]
    if name == "logistic_regression":
        num_steps.append(("scale", StandardScaler()))
    transformers = [("num", Pipeline(num_steps), numeric or NUMERIC_FEATURES)]
    if not sensor_only:
        transformers.append(("cat", OneHotEncoder(categories=[sorted(foods)], handle_unknown="error",
                                                  sparse_output=False), CATEGORICAL_FEATURES))
    pre = ColumnTransformer(transformers)
    if name == "logistic_regression":
        clf = LogisticRegression(max_iter=3000, class_weight="balanced", random_state=seed)
    elif name == "random_forest":
        clf = RandomForestClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced_subsample",
                                     n_jobs=-1, random_state=seed)
    elif name == "extra_trees":
        clf = ExtraTreesClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced_subsample",
                                   n_jobs=-1, random_state=seed)
    elif name == "hist_gradient_boosting":
        clf = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.1, min_samples_leaf=40,
                                             class_weight="balanced", random_state=seed)
    else:
        raise ValueError(f"unknown model {name}")
    return Pipeline([("pre", pre), ("clf", clf)])


def grouped_splits(mode: str, y: pd.Series, groups: pd.Series, seed: int = RANDOM_SEED, n_splits: int = 5):
    """Group-aware splits: no group (specimen/recording) is ever in both train and test.

    proxy_real -> leave-one-specimen-out (only 9 specimens, so every fold is a different specimen)
    others     -> StratifiedGroupKFold(5)
    """
    X_dummy = np.zeros(len(y))
    if mode == "proxy_real":
        splits = list(LeaveOneGroupOut().split(X_dummy, y, groups))
    else:
        splits = list(StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed)
                      .split(X_dummy, y, groups))
    g = groups.to_numpy()
    for tr, te in splits:  # hard guarantee
        assert not set(g[tr]) & set(g[te]), "group leakage between train and test"
    return splits


def oof_predict(make_pipe, X: pd.DataFrame, y: pd.Series, splits):
    """Out-of-fold class predictions + probabilities + the train-majority baseline predictions."""
    pred = np.empty(len(y), dtype=object)
    proba = np.zeros((len(y), len(CLASSES)))
    base = np.empty(len(y), dtype=object)
    fold = np.zeros(len(y), dtype=int)
    for i, (tr, te) in enumerate(splits):
        pipe = make_pipe()
        pipe.fit(X.iloc[tr], y.iloc[tr])
        assert list(pipe.classes_) == CLASSES or set(pipe.classes_) <= set(CLASSES)
        p = pipe.predict_proba(X.iloc[te])
        full = np.zeros((len(te), len(CLASSES)))
        for j, c in enumerate(pipe.classes_):
            full[:, CLASSES.index(c)] = p[:, j]
        proba[te] = full
        pred[te] = np.array(CLASSES)[full.argmax(axis=1)]
        base[te] = y.iloc[tr].value_counts().idxmax()
        fold[te] = i
    return pred, proba, base, fold


def _balanced_acc(y_true, y_pred) -> float:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # single-class slices are expected in breakdowns
        return float(balanced_accuracy_score(y_true, y_pred))


def compute_metrics(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, zero_division=0)
    mp, mr, mf, _ = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, average="macro", zero_division=0)
    return {
        "n": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": _balanced_acc(y_true, y_pred),
        "macro_precision": float(mp), "macro_recall": float(mr), "macro_f1": float(mf),
        "per_class": {c: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(s[i])}
                      for i, c in enumerate(CLASSES)},
        "confusion_matrix": {"labels": CLASSES,
                             "matrix": confusion_matrix(y_true, y_pred, labels=CLASSES).tolist(),
                             "note": "rows = true class, columns = predicted class"},
    }


def per_fold_accuracy(y, pred, fold, groups) -> list[dict]:
    out = []
    for k in sorted(set(fold)):
        m = fold == k
        out.append({"fold": int(k), "held_out_groups": sorted(set(groups[m]))[:5], "n": int(m.sum()),
                    "accuracy": float(accuracy_score(np.asarray(y)[m], pred[m]))})
    return out


def reliability_assessment(mode: str, y: pd.Series, groups: pd.Series, df: pd.DataFrame) -> dict:
    """Programmatic statement of how much the estimates can be trusted."""
    n_groups = int(groups.nunique())
    per_class_groups = {c: int(groups[y == c].nunique()) for c in CLASSES}
    reasons = []
    if n_groups < 30:
        reasons.append(f"only {n_groups} independent groups")
    if min(per_class_groups.values()) < 10:
        reasons.append(f"fewer than 10 independent groups for some class: {per_class_groups}")
    if mode in ("synthetic_demo", "combined_demo"):
        reasons.append("synthetic records come from a class-conditional generator; metrics measure how well the "
                       "generator's classes can be separated, not real-world freshness")
    if mode in ("proxy_real", "combined_demo"):
        reasons.append("labels are storage-day proxies, so metrics measure agreement with the proxy rule")
        foods_missing = [f for f, g in df[df["is_synthetic"] == False].groupby("food_type")  # noqa: E712
                         if set(CLASSES) - set(g["freshness_label"])]
        if foods_missing:
            reasons.append(f"real foods lacking a class (no real Spoiled examples): {foods_missing}")
    return {"independent_groups": n_groups, "groups_per_class": per_class_groups,
            "estimates_reliable": not reasons, "reasons": reasons}
