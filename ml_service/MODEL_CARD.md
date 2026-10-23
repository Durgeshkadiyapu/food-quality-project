# Model card — IoT Food Quality Predictor (ML component) v1.0.0

## Summary
Three separately trained scikit-learn classifiers map `fruit_type + MQ3_raw + MQ135_raw + temperature_C + humidity_pct`
to `Fresh | Semi-Fresh | Spoiled`. **Every label in the data is assumed, not observed**: either a storage-day proxy
(days 1–2 Fresh, 3–4 Semi-Fresh, 5+ Spoiled) or synthetic. The models therefore learn the *proxy rule / the generator*,
not verified freshness.

| mode | model | trained on | status |
|---|---|---|---|
| `proxy_real` (**default**) | Extra Trees (300 trees, min leaf 5, class-weight balanced) | 23,008 real readings, 9 specimens (3 Apple, 3 Banana, 3 Tomato), proxy labels | main demo model |
| `synthetic_demo` | Logistic regression (standardised, class-weight balanced) | 13,320 synthetic rows, 414 generator groups, 18 foods | **synthetic demonstration artifact** |
| `combined_demo` | Extra Trees | both of the above pooled | explicit opt-in demo; mixes provenance |

Why `proxy_real` is the default: it is the only mode trained on physically measured readings from the user's own
sensor chain, and it runs on the data as it exists today. Its limitation is coverage (3 foods only).

## Intended use
Demonstration and integration testing of the ESP32 → API → dashboard pipeline; a placeholder classifier to be replaced
once labelled data exist. **Not intended for**: deciding whether food is safe to eat, discarding/selling food, health or
regulatory use, or any claim of validated freshness detection.

## Training data
Source: `food_quality_master_expanded_transparent.csv` (36,789 rows; SHA-256 in each `metadata.json`). Partitioned by
`src/prepare_dataset.py` into real+proxy (23,008), synthetic (13,320) and unknown/unusable (461 empty-chamber baseline
rows, label `unknown`, never used as a class). All 36,789 rows have `is_label_invented = True`; the earlier audit flag
`usable_for_supervised_training` is False for every row — this project trains only in clearly-labelled demo/proxy modes.
Real data: 40 recording sessions; saturated MQ-135 rows (ADC 4095) = 1,557 (1,550 of them `Semi-Fresh`); 474 exact duplicate
measurements; temperature only 28.5–33.6 °C and RH 66–100 % in the real training data.
Not used as features: storage day, timestamps/sample numbers, specimen/session ids, source file, quality tier, MQ-2/4/5/6/7/8/9 (not installed).
Weight is not used.

## Evaluation method
Group-aware cross-validation so no specimen/recording group is in both train and test: leave-one-specimen-out (9 folds)
for `proxy_real`; StratifiedGroupKFold(5) for the others. Candidates (logistic regression, random forest, extra trees,
hist-gradient boosting) plus a majority-class baseline; selection by pooled out-of-fold macro-F1. No oversampling or
augmentation. Full numbers: `reports/evaluation_report.md`, `reports/cv_results_*.json`.

| mode | accuracy | macro-F1 | majority baseline acc / F1 |
|---|---|---|---|
| `proxy_real` | 0.892 | 0.904 | 0.337 / 0.242 |
| `synthetic_demo` | 0.722 | 0.717 | 0.351 / 0.271 |
| `combined_demo` | 0.773 | 0.772 | 0.372 / 0.181 |

**Do not read these as real-world accuracy.** The selected model was chosen on the same folds it is scored on (optimistic).

## Known issues found by the diagnostics (all in `reports/evaluation_report.md`)
1. **Only 9 real specimens**, 3 per food; no real Spoiled Banana. Estimates are unreliable (flagged in metadata and `/model-info`).
2. **Environment confounding.** With temperature and humidity removed (gas sensors + food only) real-data accuracy falls from 0.89 to 0.60.
   Temperature/humidity probably track recording day/environment drift, which is confounded with the storage-day label.
   Grouped permutation importance ranks temperature and MQ-135 highest.
3. **Saturation shortcut.** MQ-135 = 4095 almost always means `Semi-Fresh` in the real data (accuracy 99.6 % on those rows, which are almost all one class, so this is a shortcut, not skill).
4. **Quality tiers differ**: accuracy is 0.97 on tier A, 0.68 on tier B (provisional/clipped sessions).
5. **Synthetic data is not like the real data**: a sensor-only model trained on synthetic data scores 0.51 accuracy on real rows (Semi-Fresh recall 0.17);
   real→synthetic scores 0.28. Synthetic Banana is only `Spoiled` and synthetic Tomato only `Fresh`, so food type alone decides those rows
   (reported 100 % accuracy on them is an artifact).
6. Probabilities are uncalibrated tree/regression scores.

## Outputs and their meaning
`class_probabilities`: model scores. `spoilage_tendency_score` = 100·(0.5·P(Semi-Fresh)+P(Spoiled)), a demonstration index of how
far the scores lean toward Spoiled; not a validated risk score. Shelf-life estimation is **not provided**: the data has no defensible
time-to-spoilage target; it would need repeated sensor logs with an independently verified spoilage endpoint per specimen.

## Explainability
Global importance only (`reports/feature_importance.md`): model importance and grouped permutation importance. SHAP is not used
(not available in the build environment). These show what the model used, not that a sensor causes or indicates spoilage.

## Prohibited claims
- "Predicts whether food is safe/unsafe to eat" · "validated/real-world accuracy of X %" · "detects spoilage" (it reproduces a storage-day rule)
- Quoting synthetic-mode or combined-mode metrics as real performance.
- Applying to foods, sensors, enclosures or temperature/humidity ranges other than those in training without new data and validation.

## What would make the model defensible
Independent freshness labels (expert/visual/chemical, with dates), many more specimens per food in different environments and
sessions, MQ sensor calibration (R0 / baseline per session), controlled temperature/humidity, and a held-out set collected on separate days.
