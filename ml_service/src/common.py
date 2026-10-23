"""Shared constants and helpers for the training pipeline.

Single source of truth for: feature names, class order, training modes,
paths and the (hard) list of columns that must never become model features.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_RAW = ROOT / "data" / "raw"
DATA_PREPARED = ROOT / "data" / "prepared"
MODELS_DIR = ROOT / "models"
REPORTS_DIR = ROOT / "reports"

MASTER_CSV_NAME = "food_quality_master_expanded_transparent.csv"
DEMO_CSV_NAME = "food_quality_demo_training_data.csv"
RANDOM_SEED = 42
MODEL_VERSION_BASE = "1.0.0"

# Ordinal order: least -> most spoiled. Matches sklearn's alphabetical classes_.
CLASSES = ["Fresh", "Semi-Fresh", "Spoiled"]
TARGET_COL = "freshness_label"
GROUP_COL = "training_split_group"

# Source column -> model input name. The source CSV keeps its original names.
SOURCE_FOOD_COL = "food_type"
MODEL_FOOD_COL = "fruit_type"
NUMERIC_FEATURES = ["MQ3_raw", "MQ135_raw", "temperature_C", "humidity_pct"]
CATEGORICAL_FEATURES = [MODEL_FOOD_COL]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# Columns that may be used for auditing / grouped splitting but NEVER as features.
FORBIDDEN_FEATURES = [
    "storage_day", "sample_id", "sample_number", "timestamp", "specimen_uid",
    "training_split_group", "source_id", "source_file", "source_row",
    "label_method", "freshness_label_original", "quality_tier",
    # Gas sensors that are not installed in the prototype:
    "MQ2_raw", "MQ4_raw", "MQ5_raw", "MQ6_raw", "MQ7_raw", "MQ8_raw", "MQ9_raw",
]

PROXY_LABEL_METHOD = "storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled"
SYNTHETIC_LABEL_METHOD = "synthetic_class_conditional_generator_existing_package"

PREPARED_FILES = {
    "real_proxy": "real_proxy_labelled.csv",
    "synthetic": "synthetic_demo.csv",
    "unknown_unusable": "unknown_or_unusable.csv",
}

# training mode -> which prepared datasets feed it
MODES = {
    "proxy_real": {
        "datasets": ["real_proxy"],
        "description": "Real sensor measurements with storage-day PROXY labels (not verified freshness).",
        "warning": (
            "Model trained on real sensor readings from only 9 specimens (Apple, Banana, Tomato) whose "
            "labels are storage-day proxies (days 1-2 Fresh, 3-4 Semi-Fresh, 5+ Spoiled), not verified "
            "freshness. It predicts the proxy rule, not food safety. Not validated for real-world use."
        ),
    },
    "synthetic_demo": {
        "datasets": ["synthetic"],
        "description": "Synthetic demonstration measurements with synthetic labels.",
        "warning": (
            "SYNTHETIC DEMONSTRATION MODEL: trained on generated sensor values and assumed labels. "
            "Output is not evidence of real-world freshness. Not a food-safety indicator."
        ),
    },
    "combined_demo": {
        "datasets": ["real_proxy", "synthetic"],
        "description": "Explicitly selected demo: real proxy-labelled + synthetic records pooled.",
        "warning": (
            "COMBINED DEMONSTRATION MODEL: pools real proxy-labelled readings with synthetic records "
            "(synthetic rows dominate foods other than Apple). Output is not verified freshness and "
            "not a food-safety indicator."
        ),
    },
}
DEFAULT_MODE = "proxy_real"


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_master_csv(cli_path: str | None = None) -> Path:
    """CLI arg > $FOOD_QUALITY_DATASET > data/raw/<master name>."""
    cand = cli_path or os.environ.get("FOOD_QUALITY_DATASET")
    path = Path(cand) if cand else DATA_RAW / MASTER_CSV_NAME
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\nPlace {MASTER_CSV_NAME} in data/raw/ or pass --dataset <path>."
        )
    return path


def load_prepared(mode: str, prepared_dir: Path | None = None) -> pd.DataFrame:
    """Load and concatenate the prepared dataset(s) for a training mode."""
    prepared_dir = Path(prepared_dir or DATA_PREPARED)
    frames = []
    for key in MODES[mode]["datasets"]:
        p = prepared_dir / PREPARED_FILES[key]
        if not p.exists():
            raise FileNotFoundError(f"{p} missing - run `python -m src.prepare_dataset` first.")
        frames.append(pd.read_csv(p, low_memory=False))
    return pd.concat(frames, ignore_index=True)


def make_xy(df: pd.DataFrame):
    """Build (X, y, groups) using ONLY the declared features. Raises on forbidden leaks."""
    assert not set(FEATURES) & set(FORBIDDEN_FEATURES), "feature list contains a forbidden column"
    X = df.rename(columns={SOURCE_FOOD_COL: MODEL_FOOD_COL})[FEATURES].copy()
    return X, df[TARGET_COL].copy(), df[GROUP_COL].copy()
