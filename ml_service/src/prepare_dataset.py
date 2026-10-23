"""Split the master dataset into three explicitly separated datasets.

  real_proxy_labelled.csv  real sensor readings + explicit storage-day proxy labels
  synthetic_demo.csv       synthetic readings + synthetic labels
  unknown_or_unusable.csv  everything else, with a `prepare_reason` column

Original columns/values are preserved. The source files are never modified.
Run: python -m src.prepare_dataset [--dataset PATH] [--out DIR]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .common import (CLASSES, DATA_PREPARED, FEATURES, GROUP_COL, NUMERIC_FEATURES, PREPARED_FILES,
                     PROXY_LABEL_METHOD, REPORTS_DIR, SOURCE_FOOD_COL, TARGET_COL, file_sha256,
                     resolve_master_csv)


def proxy_rule(day: float) -> str:
    if pd.isna(day):
        return "unknown"
    return "Fresh" if day <= 2 else "Semi-Fresh" if day <= 4 else "Spoiled"


def assign_partition(df: pd.DataFrame) -> pd.Series:
    """Return a Series: 'real_proxy' | 'synthetic' | 'unknown_unusable:<reason>' (first rule wins)."""
    part = pd.Series("", index=df.index, dtype=object)

    def mark(mask, label):
        nonlocal part
        part = part.where(part != "", pd.Series(np.where(mask, label, ""), index=df.index))

    mark(~df[TARGET_COL].isin(CLASSES), "unknown_unusable:label_not_a_target_class")
    mark((df[SOURCE_FOOD_COL] == "Empty_Container") | (df["food_category"] == "baseline"),
         "unknown_unusable:empty_chamber_baseline_not_a_food")
    mark(df[[SOURCE_FOOD_COL] + NUMERIC_FEATURES].isna().any(axis=1), "unknown_unusable:missing_feature_value")
    mark(df[GROUP_COL].isna(), "unknown_unusable:missing_group_id")
    mark(~df["demo_training_candidate"].astype(bool), "unknown_unusable:not_demo_training_candidate")

    real = (~df["is_synthetic"].astype(bool)) & df["is_sensor_value_real"].astype(bool)
    syn = df["is_synthetic"].astype(bool) & (~df["is_sensor_value_real"].astype(bool))
    # Real rows must carry the explicit proxy method AND agree with the storage-day rule.
    rule_ok = df["storage_day"].map(proxy_rule) == df[TARGET_COL]
    real_ok = real & (df["label_method"] == PROXY_LABEL_METHOD) & rule_ok
    mark(real & ~real_ok, "unknown_unusable:real_row_label_not_explicit_storage_day_proxy")
    mark(real_ok, "real_proxy")
    mark(syn, "synthetic")
    mark(part == "", "unknown_unusable:unclassified_origin")
    return part


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", help="path to the master CSV")
    ap.add_argument("--out", default=str(DATA_PREPARED))
    ap.add_argument("--reports", default=str(REPORTS_DIR))
    a = ap.parse_args(argv)

    src = resolve_master_csv(a.dataset)
    df = pd.read_csv(src, low_memory=False)
    part = assign_partition(df)

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    pieces = {
        "real_proxy": df[part == "real_proxy"],
        "synthetic": df[part == "synthetic"],
        "unknown_unusable": df[part.str.startswith("unknown_unusable")].assign(
            prepare_reason=part[part.str.startswith("unknown_unusable")].str.split(":", n=1).str[1]),
    }
    total = sum(len(v) for v in pieces.values())
    assert total == len(df), f"partition lost/duplicated rows: {total} != {len(df)}"
    ids = pd.concat([v["sample_id"] for v in pieces.values()])
    assert ids.is_unique, "a sample_id landed in more than one dataset"

    for key, frame in pieces.items():
        frame.to_csv(out / PREPARED_FILES[key], index=False)

    summary = {
        "source_file": str(src), "source_sha256": file_sha256(src), "source_rows": int(len(df)),
        "feature_columns_used_downstream": FEATURES,
        "transformations": [
            f"No values modified. Model input `fruit_type` is read from source column `{SOURCE_FOOD_COL}` at training time.",
            "Rows partitioned by explicit provenance flags (is_synthetic, is_sensor_value_real, label_method, label vs storage-day rule).",
            "The source flag `usable_for_supervised_training` is False for every row (earlier audit); this project overrides it "
            "ONLY for clearly-labelled demonstration/proxy training via `demo_training_candidate`.",
            "Real rows are kept regardless of quality_tier (A/B/C), saturation and RH=100; breakdowns by these are reported in evaluation.",
        ],
        "datasets": {k: {"file": PREPARED_FILES[k], "rows": int(len(v)),
                         "label_counts": v[TARGET_COL].value_counts().to_dict(),
                         "food_counts": v[SOURCE_FOOD_COL].value_counts().to_dict(),
                         "independent_groups": int(v[GROUP_COL].nunique())} for k, v in pieces.items()},
        "unknown_unusable_reasons": pieces["unknown_unusable"]["prepare_reason"].value_counts().to_dict(),
    }
    Path(a.reports).mkdir(parents=True, exist_ok=True)
    (Path(a.reports) / "prepare_summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({k: v["rows"] for k, v in summary["datasets"].items()}, indent=2))
    print("unknown/unusable reasons:", summary["unknown_unusable_reasons"])


if __name__ == "__main__":
    main()
