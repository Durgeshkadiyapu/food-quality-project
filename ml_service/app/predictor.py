"""Framework-independent inference logic (no FastAPI import) so it can be unit-tested directly.

Loads saved artifacts (model.joblib + metadata.json) per training mode, validates readings,
returns structured predictions. Invalid readings are REJECTED, never replaced or clipped.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from .config import SENSOR_LIMITS, TRAINING_MODES

SENSOR_FIELDS = ["MQ3_raw", "MQ135_raw", "temperature_C", "humidity_pct"]
REQUIRED_FIELDS = ["fruit_type"] + SENSOR_FIELDS


class PredictionError(Exception):
    """Base class; `code` and `status` map to the API error format."""
    code = "prediction_error"
    status = 422

    def __init__(self, message: str, details: Any = None):
        super().__init__(message)
        self.message, self.details = message, details


class InvalidInputError(PredictionError):
    code = "validation_error"


class UnsupportedFruitError(PredictionError):
    code = "unsupported_fruit_type"


class ModelUnavailableError(PredictionError):
    code = "model_unavailable"
    status = 503


class TrainingModeUnavailableError(PredictionError):
    code = "training_mode_unavailable"
    status = 422


def validate_reading(reading: dict) -> dict:
    """Strict validation; returns a clean dict or raises InvalidInputError listing EVERY problem."""
    problems = []
    unknown = sorted(set(reading) - set(REQUIRED_FIELDS))
    if unknown:
        problems.append({"field": ",".join(unknown), "problem": "unexpected field(s); not model inputs"})
    out: dict = {}
    for f in REQUIRED_FIELDS:
        if f not in reading or reading[f] is None:
            problems.append({"field": f, "problem": "missing"})
    fruit = reading.get("fruit_type")
    if fruit is not None:
        if not isinstance(fruit, str) or not fruit.strip():
            problems.append({"field": "fruit_type", "problem": "must be a non-empty string"})
        else:
            out["fruit_type"] = fruit.strip()
    for f in SENSOR_FIELDS:
        v = reading.get(f)
        if v is None:
            continue
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            problems.append({"field": f, "problem": "must be a number"})
        elif not math.isfinite(v):
            problems.append({"field": f, "problem": "must be finite (no NaN/Infinity)"})
        else:
            lim = SENSOR_LIMITS[f]
            if not lim["min"] <= v <= lim["max"]:
                problems.append({"field": f, "problem": f"{v} outside valid sensor range [{lim['min']}, {lim['max']}] ({lim['unit']})"})
            else:
                out[f] = float(v)
    if problems:
        raise InvalidInputError("Invalid sensor reading", problems)
    return out


class ModelBundle:
    def __init__(self, directory: Path):
        self.directory = Path(directory)
        self.metadata: dict = json.loads((self.directory / "metadata.json").read_text())
        self.pipeline = joblib.load(self.directory / "model.joblib")
        self.classes: list[str] = list(self.pipeline.classes_)
        self.features: list[str] = self.metadata["features"]
        if self.classes != self.metadata["classes"]:
            raise RuntimeError("model classes do not match metadata")

    @property
    def mode(self) -> str:
        return self.metadata["training_mode"]

    def canonical_fruit(self, fruit: str) -> str:
        """Case-insensitive match to a supported food; raises if unsupported."""
        lookup = {s.lower(): s for s in self.metadata["supported_fruit_types"]}
        hit = lookup.get(fruit.strip().lower())
        if hit is None:
            raise UnsupportedFruitError(
                f"fruit_type '{fruit}' is not supported by training mode '{self.mode}'",
                {"supported_fruit_types": self.metadata["supported_fruit_types"]})
        return hit

    def out_of_training_range(self, clean: dict) -> list[str]:
        r = self.metadata["training_ranges"]
        return [f for f in SENSOR_FIELDS if not r[f]["min"] <= clean[f] <= r[f]["max"]]

    def _warning(self, extrapolated: list[str], saturated: bool) -> str:
        w = self.metadata["warning"]
        if extrapolated:
            w += f" Input outside the model's training range for: {', '.join(extrapolated)}; treat as unreliable."
        if saturated:
            w += " MQ135_raw is at the ADC maximum (4095): sensor saturated."
        return w

    def predict_records(self, readings: list[dict]) -> list[dict]:
        cleans = []
        for r in readings:
            c = validate_reading(r)
            c["fruit_type"] = self.canonical_fruit(c["fruit_type"])
            cleans.append(c)
        X = pd.DataFrame(cleans)[self.features]
        proba = self.pipeline.predict_proba(X)
        out = []
        for c, p in zip(cleans, proba):
            probs = {cls: round(float(v), 6) for cls, v in zip(self.classes, p)}
            predicted = self.classes[int(p.argmax())]
            score = 100.0 * (0.5 * float(p[self.classes.index("Semi-Fresh")]) + 1.0 * float(p[self.classes.index("Spoiled")]))
            extrap = self.out_of_training_range(c)
            out.append({
                "predicted_class": predicted, "class_probabilities": probs, "fruit_type": c["fruit_type"],
                "spoilage_tendency_score": round(score, 1), "out_of_training_range": extrap,
                "model_version": self.metadata["model_version"], "training_mode": self.mode,
                "label_method": self.metadata["label_method"],
                "warning": self._warning(extrap, c["MQ135_raw"] >= 4095),
            })
        return out


class PredictorService:
    def __init__(self, models_dir: Path, default_mode: str = "proxy_real"):
        self.models_dir, self.default_mode = Path(models_dir), default_mode
        self.bundles: dict[str, ModelBundle] = {}
        self.load_errors: dict[str, str] = {}
        for mode in TRAINING_MODES:
            d = self.models_dir / mode
            if (d / "model.joblib").exists() and (d / "metadata.json").exists():
                try:
                    self.bundles[mode] = ModelBundle(d)
                except Exception as e:  # noqa: BLE001 - surfaced in /health
                    self.load_errors[mode] = f"{type(e).__name__}: {e}"

    def get(self, mode: str | None) -> ModelBundle:
        if not self.bundles:
            raise ModelUnavailableError("No trained model artifacts are loaded", {"models_dir": str(self.models_dir)})
        mode = mode or self.default_mode
        if mode not in TRAINING_MODES:
            raise TrainingModeUnavailableError(f"unknown training_mode '{mode}'", {"allowed": list(TRAINING_MODES)})
        if mode not in self.bundles:
            raise TrainingModeUnavailableError(f"training_mode '{mode}' is not loaded",
                                               {"loaded": sorted(self.bundles)})
        return self.bundles[mode]

    def predict(self, reading: dict, mode: str | None = None) -> dict:
        return self.get(mode).predict_records([reading])[0]

    def predict_batch(self, readings: list[dict], mode: str | None = None) -> list[dict]:
        return self.get(mode).predict_records(readings)

    def health(self) -> dict:
        ok = self.default_mode in self.bundles
        return {
            "status": "ok" if ok else ("degraded" if self.bundles else "unavailable"),
            "model_available": ok,
            "default_training_mode": self.default_mode,
            "model_version": self.bundles[self.default_mode].metadata["model_version"] if ok else None,
            "loaded_training_modes": sorted(self.bundles),
            "load_errors": self.load_errors,
        }

    def model_info(self) -> dict:
        models = {}
        for mode, b in self.bundles.items():
            m = b.metadata
            models[mode] = {
                "training_mode": mode, "model_version": m["model_version"], "model_type": m["model_class"],
                "model_name": m["model_name"], "classes": m["classes"],
                "label_method": m["label_method"], "label_provenance_note": m["label_provenance_note"],
                "is_synthetic_demonstration": m["is_synthetic_demonstration"],
                "supported_fruit_types": m["supported_fruit_types"],
                "inputs": {"fruit_type": {"type": "string", "required": True, "supported": m["supported_fruit_types"]},
                           **{f: {"type": "number", "required": True, **SENSOR_LIMITS[f],
                                  "training_range": m["training_ranges"][f]} for f in SENSOR_FIELDS}},
                "excluded_inputs": "storage day, timestamps, specimen/session ids, other gas sensors, weight (not used)",
                "trained_at_utc": m["trained_at_utc"], "training_rows": m["training_data"]["rows"],
                "independent_training_groups": m["training_data"]["independent_groups"],
                "evaluation": {"method": m["evaluation"]["method"],
                               "accuracy": m["evaluation"]["selected_model_metrics"]["accuracy"],
                               "macro_f1": m["evaluation"]["selected_model_metrics"]["macro_f1"],
                               "majority_baseline_accuracy": m["evaluation"]["majority_baseline"]["accuracy"],
                               "estimates_reliable": m["evaluation"]["reliability"]["estimates_reliable"],
                               "reliability_notes": m["evaluation"]["reliability"]["reasons"]},
                "risk_score": m["risk_score_definition"],
                "warning": m["warning"],
            }
        return {
            "default_training_mode": self.default_mode, "models": models,
            "capabilities": {
                "classification": True, "class_probabilities": True, "spoilage_tendency_score": True,
                "batch_prediction": True,
                "shelf_life_estimation": {"available": False, "reason": (
                    "The dataset has no defensible shelf-life target (no measured remaining-days-to-spoilage). "
                    "Requires repeated sensor logs with an independently verified spoilage endpoint per specimen.")},
                "explainability": "global feature importance in reports/feature_importance.md (no per-request explanations)",
            },
        }
