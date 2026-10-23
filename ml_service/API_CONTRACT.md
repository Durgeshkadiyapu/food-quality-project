# API contract — Food Quality ML Service v1.0.0

Base URL (local): `http://127.0.0.1:8000` · Interactive docs: `/docs` · All bodies are JSON (UTF-8).

> **Meaning of the output.** `predicted_class` is the model's best guess of a *label that was assumed* (storage-day
> proxy or synthetic), **not verified freshness and not a food-safety statement**. `class_probabilities` are
> uncalibrated model scores, not the probability that food is safe to eat. Show `warning` to users.

## Training modes (`training_mode`)
| value | trained on | foods supported | default |
|---|---|---|---|
| `proxy_real` | real sensor readings + storage-day proxy labels | Apple, Banana, Tomato | **yes** |
| `synthetic_demo` | synthetic readings + synthetic labels | 18 foods (see `/model-info`) | no |
| `combined_demo` | both pooled (explicit opt-in) | 19 foods | no |

A mode is available only if its artifacts exist in `models/`. Omit `training_mode` to use the server default.

## `GET /health`
```json
{"status":"ok","model_available":true,"default_training_mode":"proxy_real","model_version":"1.0.0-proxy_real",
 "loaded_training_modes":["combined_demo","proxy_real","synthetic_demo"],"load_errors":{}}
```
`status`: `ok` (default model loaded) · `degraded` (some models loaded, not the default) · `unavailable` (none). Always HTTP 200.

## `GET /model-info` (and alias `GET /capabilities`)
Returns `default_training_mode`, `models.<mode>` (type, version, classes, `inputs` with units/limits/training range,
`supported_fruit_types`, `label_method`, evaluation summary and `reliability_notes`, `risk_score` definition, `warning`)
and `capabilities` (`shelf_life_estimation.available = false` with reason).
Both `/model-info` and `/capabilities` return identical JSON responses.

## `POST /predict`
Request (illustrative values, not a real measurement):
```json
{"fruit_type":"Apple","MQ3_raw":2150,"MQ135_raw":1800,"temperature_C":28.5,"humidity_pct":75.0}
```
| field | type | required | rule |
|---|---|---|---|
| `fruit_type` | string | yes | must be supported by the selected mode; matched case-insensitively, returned in canonical case |
| `MQ3_raw` | number | yes | 0–4095 (ESP32 12-bit ADC counts) |
| `MQ135_raw` | number | yes | 0–4095 |
| `temperature_C` | number | yes | −40–80 |
| `humidity_pct` | number | yes | 0–100 |
| `training_mode` | string | no | `proxy_real` \| `synthetic_demo` \| `combined_demo` |

Numbers must be JSON numbers (strings, booleans, NaN, Infinity rejected). Extra fields (e.g. `storage_day`) are rejected.
Values are never clipped or imputed. Valid-but-unusual readings are accepted and flagged (see `out_of_training_range`).

Response 200 (real output of the shipped `proxy_real` model for the request above):
```json
{"predicted_class":"Semi-Fresh",
 "class_probabilities":{"Fresh":0.366273,"Semi-Fresh":0.566125,"Spoiled":0.067602},
 "fruit_type":"Apple","model_version":"1.0.0-proxy_real","training_mode":"proxy_real",
 "label_method":"storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled",
 "warning":"Model trained on real sensor readings from only 9 specimens ... Not validated for real-world use.",
 "spoilage_tendency_score":35.1,"out_of_training_range":[]}
```
| field | meaning |
|---|---|
| `predicted_class` | `Fresh` \| `Semi-Fresh` \| `Spoiled` (argmax of `class_probabilities`) |
| `class_probabilities` | map class → score, sums to 1 (uncalibrated) |
| `label_method` | how the training labels were produced (proxy / synthetic) |
| `warning` | always present; may append out-of-range or saturation (MQ135 = 4095) notes |
| `spoilage_tendency_score` | `100·(0.5·P(Semi-Fresh) + 1.0·P(Spoiled))`, 0–100. Demonstration score of how far the model leans toward Spoiled. **Not** a validated food-safety risk |
| `out_of_training_range` | sensor fields outside the range seen in training (treat result as unreliable) |

## `POST /predict/batch`
Request: `{"training_mode": null, "records": [ <SensorReading>, ... ]}` (1 to `MAX_BATCH_SIZE`=500 records, same field rules; no per-record `training_mode`).
Response 200:
```json
{"count":2,"model_version":"1.0.0-proxy_real","training_mode":"proxy_real","label_method":"...","warning":"...",
 "predictions":[{"index":0,"predicted_class":"...","class_probabilities":{...},"fruit_type":"Apple",
                 "spoilage_tendency_score":35.1,"out_of_training_range":[],"warning":"..."}]}
```
The whole batch is rejected if any record is invalid (no partial results). Too many records → 413 `batch_too_large`.

## Errors
Every non-2xx response uses:
```json
{"error":{"code":"validation_error","message":"Request validation failed","details":[{"field":"humidity_pct","problem":"Input should be less than or equal to 100","type":"less_than_equal"}]}}
```
| HTTP | `code` | when | `details` |
|---|---|---|---|
| 422 | `validation_error` | missing/extra field, wrong type, out of physical range, NaN, bad `training_mode` | list of `{field, problem, type?}` |
| 422 | `unsupported_fruit_type` | food not supported by the selected mode | `{supported_fruit_types: [...]}` |
| 422 | `training_mode_unavailable` | mode not trained/loaded | `{loaded: [...]}` or `{allowed: [...]}` |
| 413 | `batch_too_large` | more than `MAX_BATCH_SIZE` records | `{received: n}` |
| 503 | `model_unavailable` | no model artifacts loaded | `{models_dir}` |
| 404/405 | `http_error` | unknown route / method | — |

## CORS
Allowed origins come from `CORS_ORIGINS` (default `http://localhost:5173,http://localhost:3000`); methods GET/POST/OPTIONS; no credentials.
Set it to your exact React dev and production origins before deploying.

## Compatibility notes for the React phase
- Field names are exact and case-sensitive: `MQ3_raw`, `MQ135_raw`, `temperature_C`, `humidity_pct`, `fruit_type`.
- Treat `predicted_class` as one of exactly three strings; always display `warning`.
- Fetch `/model-info` once to populate the food dropdown from `models.<mode>.supported_fruit_types`.
