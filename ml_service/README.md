# Food Quality ML Service (Python / scikit-learn / FastAPI)

ML component of the **IoT-Based AI Food Quality Predictor** (ESP32 + MQ-3 + MQ-135 + DHT22 → Spring Boot → **this service** → React).
It trains freshness classifiers, serves them over a REST API, and documents what they can and cannot claim.

> **Read first.** All labels are *assumed* (storage-day proxy for real readings; generated for synthetic rows), not verified freshness.
> The models reproduce those labelling rules. Outputs are demonstrations, never food-safety advice. See `MODEL_CARD.md`.

## Layout
```
app/        FastAPI service (main.py routes, predictor.py logic, schemas.py contract, config.py)
src/        inspect_dataset, prepare_dataset, train_model, evaluate_model, explain_model (+ common, evaluation)
models/     trained artifacts: models/<mode>/model.joblib + metadata.json  (3 modes shipped)
reports/    dataset_inspection, prepare_summary, cv_results_*, evaluation_report, feature_importance
tests/      pytest suite + small fixture (tests/fixtures/sample_master.csv)
data/raw/   put the master CSV here (not shipped)       API_CONTRACT.md  MODEL_CARD.md
```

## Setup on Windows (PowerShell, Python 3.11+; developed on 3.13)
```powershell
cd ml_service
python -m venv .venv
.venv\Scripts\Activate.ps1          # cmd.exe: .venv\Scripts\activate.bat
pip install -r requirements.txt
```
If activation is blocked: `Set-ExecutionPolicy -Scope Process Bypass`.
`scikit-learn`, `pandas`, `numpy` are pinned to the versions used to build the shipped models.

## Run the API (shipped models, no training needed)
```powershell
copy .env.example .env
uvicorn app.main:app --env-file .env --port 8000
```
Open http://127.0.0.1:8000/docs. Test:
```powershell
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d "{\"fruit_type\":\"Apple\",\"MQ3_raw\":2150,\"MQ135_raw\":1800,\"temperature_C\":28.5,\"humidity_pct\":75.0}"
```
(PowerShell tip: `Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/predict -ContentType application/json -Body '{"fruit_type":"Apple","MQ3_raw":2150,"MQ135_raw":1800,"temperature_C":28.5,"humidity_pct":75.0}'`)

Full request/response/error schemas: **`API_CONTRACT.md`**.

## Retrain from the dataset
Dataset: copy `food_quality_master_expanded_transparent.csv` to `data/raw/` (or set `FOOD_QUALITY_DATASET`). Expected columns are listed in `data/README.md`.
```powershell
python -m src.inspect_dataset                      # reports/dataset_inspection.md|json
python -m src.prepare_dataset                      # data/prepared/*.csv (real_proxy / synthetic / unknown)
python -m src.train_model --mode proxy_real        # DEFAULT: real readings, proxy labels
python -m src.train_model --mode synthetic_demo    # synthetic demonstration model
python -m src.train_model --mode combined_demo     # optional, explicit pooled demo
python -m src.evaluate_model                       # reports/evaluation_report.md (breakdowns, ablations, transfer)
python -m src.explain_model                        # reports/feature_importance.md
pytest                                             # tests
```
Training all three modes takes a few minutes on a 2-core machine (leave-one-specimen-out for `proxy_real`). Seed = 42; results are reproducible.
Modes are never mixed implicitly: each reads only its own prepared datasets.

## What is trained
* Pipeline = median imputer (+ scaler for logistic regression) + one-hot `fruit_type` + classifier, saved as one object.
  The API rejects missing values, so the imputer never fills real requests.
* Candidates: logistic regression, random forest, extra trees, hist-gradient boosting; best pooled out-of-fold macro-F1 is kept.
* Group-aware splits (specimen/recording group never in both train and test). Class balancing via `class_weight` (training rows only); no oversampling.
* Features: `fruit_type, MQ3_raw, MQ135_raw, temperature_C, humidity_pct` only. No storage day, ids, timestamps, other MQ sensors, weight.

## Results (summary; not real-world accuracy)
| mode | model | accuracy | macro-F1 | majority baseline acc |
|---|---|---|---|---|
| `proxy_real` | Extra Trees | 0.892 | 0.904 | 0.337 |
| `synthetic_demo` | Logistic regression | 0.722 | 0.717 | 0.351 |
| `combined_demo` | Extra Trees | 0.773 | 0.772 | 0.372 |

## Current limitations (before the React phase)
* Only 9 real specimens (Apple/Banana/Tomato); no real Spoiled Banana. Other foods exist only in synthetic/combined modes.
* Labels are storage-day proxies; the real-data model leans on temperature/humidity (gas-only ablation: 0.60 accuracy) which may reflect recording-day drift, and on MQ-135 saturation (4095 ≈ Semi-Fresh in the data).
* Training temperature range is narrow (28.5–33.6 °C, RH 66–100 %); inputs outside the training range are accepted but flagged in `out_of_training_range`/`warning`.
* Probabilities are uncalibrated. No shelf-life model (no defensible target). No SHAP; global importance only.
* Switch `DEFAULT_TRAINING_MODE` only knowingly; synthetic/combined outputs must stay visibly labelled "demo" in the UI.

## Troubleshooting
| symptom | fix |
|---|---|
| `FileNotFoundError: Dataset not found` | copy the master CSV to `data/raw/` or pass `--dataset PATH` |
| `... missing - run python -m src.prepare_dataset first` | run prepare before training |
| `/health` shows `"status":"unavailable"` | `models/<mode>/` missing; train or restore `models/` ; check `MODELS_DIR` |
| `/health` shows `load_errors` / pickle errors | scikit-learn version differs from the pinned one; `pip install -r requirements.txt` or retrain |
| 422 `unsupported_fruit_type` | food not in the mode's list (`/model-info`); `proxy_real` supports Apple, Banana, Tomato |
| 422 `validation_error` | see `details`; ranges: MQ 0–4095, temp −40–80, RH 0–100; numbers must be JSON numbers; no extra fields |
| browser CORS error | add the React origin to `CORS_ORIGINS` and restart |
| `ModuleNotFoundError: src` | run scripts from the `ml_service` folder with `python -m src.<script>` |
| `uvicorn` not found | activate the venv; `pip install -r requirements.txt` |

## Verification status
Run and verified locally with pytest (log: `reports/test_run.txt`):
* **ALL PASSED (59 of 59 tests)**:
  - Dataset inspection, preparation, and training for all 3 modes (`proxy_real`, `synthetic_demo`, `combined_demo`).
  - Pipeline verification, group-split zero-leakage validation, artifacts and metadata integrity.
  - Predictor validation (bounds checking, input validation, non-finite number rejection, fresh-process model loading, shipped model evaluation).
  - FastAPI HTTP layer (`app/main.py`), including `GET /health`, `GET /model-info`, `GET /capabilities`, `POST /predict`, `POST /predict/batch`, CORS preflight, and strict 4xx/5xx structured error handlers (`tests/test_api.py`).
