"""Dataset inspection report (JSON + Markdown). Read-only: source files are never modified.

Run: python -m src.inspect_dataset [--dataset MASTER.csv] [--demo DEMO.csv] [--reports DIR]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from .common import (CLASSES, DEMO_CSV_NAME, FEATURES, FORBIDDEN_FEATURES, GROUP_COL, NUMERIC_FEATURES,
                     REPORTS_DIR, SOURCE_FOOD_COL, TARGET_COL, file_sha256, resolve_master_csv)
from .prepare_dataset import proxy_rule

ADC_MAX = 4095


def _counts(s):
    return {str(k): int(v) for k, v in s.value_counts(dropna=False).items()}


def inspect(master_path: Path, demo_path: Path | None) -> dict:
    m = pd.read_csv(master_path, low_memory=False)
    real = m[~m.is_synthetic.astype(bool)]
    syn = m[m.is_synthetic.astype(bool)]
    feat_cols = [SOURCE_FOOD_COL] + NUMERIC_FEATURES

    rep: dict = {"master_file": str(master_path), "master_sha256": file_sha256(master_path)}
    rep["total_rows"] = int(len(m))
    rep["columns"] = {c: str(t) for c, t in m.dtypes.items()}
    rep["missing_values"] = {c: int(n) for c, n in m.isna().sum().items() if n}
    rep["missing_values_note"] = ("storage_day is empty for synthetic rows (by design) and the empty chamber; "
                                  "quality_tier/source_file/source_row/is_rh_100 are empty for synthetic rows.")
    rep["model_feature_columns_missing"] = {c: int(m[c].isna().sum()) for c in feat_cols}
    rep["mq_columns_present"] = [c for c in m.columns if c.upper().startswith("MQ")]
    rep["forbidden_feature_columns_present_in_data"] = [c for c in FORBIDDEN_FEATURES if c in m.columns]

    rep["rows_by_data_origin"] = _counts(m.data_origin)
    rep["real_vs_synthetic"] = {"real_sensor_rows": int(len(real)), "synthetic_rows": int(len(syn)),
                                "is_sensor_value_real_true": int(m.is_sensor_value_real.sum()),
                                "is_label_invented_true": int(m.is_label_invented.sum())}
    rep["label_provenance"] = {
        "label_method": _counts(m.label_method), "label_confidence": _counts(m.label_confidence),
        "proxy_labelled_rows": int((m.label_method.str.startswith("storage_day_proxy") & (m[TARGET_COL] != "unknown")).sum()),
        "unknown_labelled_rows": int((m[TARGET_COL] == "unknown").sum()),
        "usable_for_supervised_training_true": int(m.usable_for_supervised_training.sum()),
        "demo_training_candidate_true": int(m.demo_training_candidate.sum()),
    }
    rep["food_categories"] = _counts(m[SOURCE_FOOD_COL])
    rep["freshness_classes"] = _counts(m[TARGET_COL])
    rep["class_by_origin_and_food"] = {f"{o} | {f}": _counts(g[TARGET_COL])
                                       for (o, f), g in m.groupby(["data_origin", SOURCE_FOOD_COL])}

    # duplicates
    rep["duplicates"] = {
        "duplicate_sample_id": int(m.sample_id.duplicated().sum()),
        "duplicate_measurements_all_rows(food+4 sensors)": int(m.duplicated(feat_cols).sum()),
        "duplicate_measurements_real_rows": int(real.duplicated(feat_cols).sum()),
        "duplicate_measurements_synthetic_rows": int(syn.duplicated(feat_cols).sum()),
        "duplicate_with_conflicting_labels": int((m.groupby(feat_cols)[TARGET_COL].nunique() > 1).sum()),
    }

    # independent units
    rep["independent_units"] = {
        "real_specimens": int(real.specimen_uid.nunique()),
        "real_specimens_by_food": {k: int(v) for k, v in real.groupby(SOURCE_FOOD_COL).specimen_uid.nunique().items()},
        "real_recording_sessions(source_file)": int(real.source_file.nunique()),
        "real_training_split_groups": int(real[GROUP_COL].nunique()),
        "synthetic_specimen_ids": int(syn.specimen_uid.nunique()),
        "synthetic_groups": int(syn[GROUP_COL].nunique()),
        "real_sessions_per_specimen": {k: int(v) for k, v in real.groupby("specimen_uid").source_file.nunique().items()},
        "note": ("Synthetic 'specimens' are generator labels, not physical items; they are independent only "
                 "in the sense that generated rows are not copies of real readings."),
    }

    # proxy-label consistency + class coverage per real specimen
    rr = real[real[TARGET_COL] != "unknown"]
    rep["proxy_rule_check"] = {"real_rows_checked": int(len(rr)),
                               "label_disagrees_with_storage_day_rule": int((rr.storage_day.map(proxy_rule) != rr[TARGET_COL]).sum())}
    cov = rr.groupby(["specimen_uid", TARGET_COL]).size().unstack(fill_value=0)
    rep["real_class_rows_per_specimen"] = cov.to_dict(orient="index")
    rep["real_foods_missing_a_class"] = {f: [c for c in CLASSES if c not in set(g[TARGET_COL])]
                                         for f, g in rr.groupby(SOURCE_FOOD_COL) if set(CLASSES) - set(g[TARGET_COL])}
    syn_cov = syn.groupby(SOURCE_FOOD_COL)[TARGET_COL].nunique()
    rep["synthetic_foods_with_single_class"] = {f: sorted(syn[syn[SOURCE_FOOD_COL] == f][TARGET_COL].unique())
                                                for f in syn_cov[syn_cov == 1].index}

    # saturation / suspicious
    sat = m[m.MQ135_raw >= ADC_MAX]
    rep["mq135_saturation"] = {
        "rows_at_adc_max_4095": int(len(sat)), "by_origin": _counts(sat.data_origin),
        "by_class": _counts(sat[TARGET_COL]),
        "by_specimen": _counts(sat.specimen_uid),
        "is_saturated_flag_true": int(m.is_saturated.sum()),
        "note": "Saturation is almost entirely in real Semi-Fresh rows: a potential shortcut (clipped sensor == class) to report, not hide.",
    }
    rep["invalid_or_suspicious"] = {
        "MQ3_outside_0_4095": int(((m.MQ3_raw < 0) | (m.MQ3_raw > ADC_MAX)).sum()),
        "MQ135_outside_0_4095": int(((m.MQ135_raw < 0) | (m.MQ135_raw > ADC_MAX)).sum()),
        "humidity_outside_0_100": int(((m.humidity_pct < 0) | (m.humidity_pct > 100)).sum()),
        "humidity_exactly_100_(DHT22 limit)": int((m.humidity_pct >= 100).sum()),
        "temperature_outside_-40_80": int(((m.temperature_C < -40) | (m.temperature_C > 80)).sum()),
        "empty_chamber_baseline_rows": int((m[SOURCE_FOOD_COL] == "Empty_Container").sum()),
        "real_rows_by_quality_tier": _counts(real.quality_tier),
        "real_rows_with_exclusion_reason": int(real.exclusion_reason.notna().sum()),
        "exclusion_reasons": _counts(real.exclusion_reason.dropna()),
    }
    rep["feature_ranges"] = {c: {"min": float(m[c].min()), "max": float(m[c].max()),
                                 "real_min": float(real[c].min()), "real_max": float(real[c].max()),
                                 "synthetic_min": float(syn[c].min()), "synthetic_max": float(syn[c].max())}
                             for c in NUMERIC_FEATURES}
    rep["sensor_means_by_origin_and_class"] = {
        f"{o} | {c}": g[NUMERIC_FEATURES].mean().round(1).to_dict()
        for (o, c), g in m.groupby(["data_origin", TARGET_COL])}

    # master vs demo: which is latest?
    if demo_path and demo_path.exists():
        d = pd.read_csv(demo_path, low_memory=False)
        common = m[m.sample_id.isin(d.sample_id)].sort_values("sample_id").reset_index(drop=True)
        dd = d.sort_values("sample_id").reset_index(drop=True)
        identical = list(common.columns) == list(dd.columns) and common.equals(dd) if len(common) == len(dd) else False
        rep["master_vs_demo"] = {
            "demo_file": str(demo_path), "demo_rows": int(len(d)), "master_rows": int(len(m)),
            "demo_sample_ids_subset_of_master": bool(set(d.sample_id) <= set(m.sample_id)),
            "rows_only_in_master": int((~m.sample_id.isin(d.sample_id)).sum()),
            "only_in_master_are": _counts(m[~m.sample_id.isin(d.sample_id)][TARGET_COL]),
            "overlapping_rows_identical": bool(identical),
            "conclusion": ("master is the latest/superset; demo = master minus rows with demo_training_candidate=False"
                           if identical else "files differ beyond row membership - inspect manually"),
        }
    rep["model_inputs"] = {"features": FEATURES, "target": TARGET_COL, "group_column_for_splitting_only": GROUP_COL}
    return rep


def to_markdown(r: dict) -> str:
    L = ["# Dataset inspection report", "",
         f"Source: `{r['master_file']}`  \nSHA-256: `{r['master_sha256']}`", "",
         "Files NOT available in this run: `sensor_food_quality.zip`, original audit outputs (only the audit .md in the package was reviewed).", "",
         "## Size and provenance",
         f"- Total rows: **{r['total_rows']}** ({r['real_vs_synthetic']['real_sensor_rows']} real sensor, {r['real_vs_synthetic']['synthetic_rows']} synthetic)",
         f"- Proxy-labelled rows: {r['label_provenance']['proxy_labelled_rows']}; unknown-labelled: {r['label_provenance']['unknown_labelled_rows']}",
         f"- `usable_for_supervised_training` = True for {r['label_provenance']['usable_for_supervised_training_true']} rows (flag is False everywhere; project uses `demo_training_candidate` for clearly-labelled demo/proxy training instead)",
         f"- Labels are invented/assumed for ALL rows (`is_label_invented` = {r['real_vs_synthetic']['is_label_invented_true']})", "",
         "## Classes and foods", f"- Classes: {r['freshness_classes']}", f"- Foods: {r['food_categories']}",
         f"- Real foods missing a class: {r['real_foods_missing_a_class']}",
         f"- Synthetic foods with a single class: {r['synthetic_foods_with_single_class']}", "",
         "## Independent units",
         f"- Real specimens: {r['independent_units']['real_specimens']} {r['independent_units']['real_specimens_by_food']}; recording sessions (source files): {r['independent_units']['real_recording_sessions(source_file)']}",
         f"- Synthetic generator groups: {r['independent_units']['synthetic_groups']}", "",
         "## Missing values", f"- Any: {r['missing_values']}", f"- Model feature columns: {r['model_feature_columns_missing']}", "",
         "## Duplicates", f"- {r['duplicates']}", "",
         "## MQ-135 saturation (ADC = 4095)", f"- {r['mq135_saturation']['rows_at_adc_max_4095']} rows; by class {r['mq135_saturation']['by_class']}; by origin {r['mq135_saturation']['by_origin']}",
         f"- {r['mq135_saturation']['note']}", "",
         "## Invalid / suspicious", *[f"- {k}: {v}" for k, v in r["invalid_or_suspicious"].items()], "",
         "## Proxy rule check", f"- {r['proxy_rule_check']}", "",
         "## Master vs demo file", f"- {r.get('master_vs_demo', 'demo file not supplied')}", "",
         "## Columns (dtype)", *[f"- `{c}`: {t}" for c, t in r["columns"].items()], ""]
    return "\n".join(L)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset")
    ap.add_argument("--demo", help="optional demo CSV to compare against the master")
    ap.add_argument("--reports", default=str(REPORTS_DIR))
    a = ap.parse_args(argv)
    master = resolve_master_csv(a.dataset)
    demo = Path(a.demo) if a.demo else master.parent / DEMO_CSV_NAME
    rep = inspect(master, demo)
    out = Path(a.reports)
    out.mkdir(parents=True, exist_ok=True)
    (out / "dataset_inspection.json").write_text(json.dumps(rep, indent=2, default=str))
    (out / "dataset_inspection.md").write_text(to_markdown(rep))
    print(f"wrote {out/'dataset_inspection.json'} and .md")


if __name__ == "__main__":
    main()
