import json
import subprocess
import sys
from pathlib import Path

import pytest

from app.predictor import (InvalidInputError, ModelUnavailableError, PredictorService,
                           TrainingModeUnavailableError, UnsupportedFruitError, validate_reading)

OK = {"fruit_type": "Apple", "MQ3_raw": 2150, "MQ135_raw": 1800, "temperature_C": 28.5, "humidity_pct": 75.0}
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def svc(trained):
    return PredictorService(trained["models"], "proxy_real")


def test_predict_ok(svc):
    r = svc.predict(OK)
    assert r["predicted_class"] in ("Fresh", "Semi-Fresh", "Spoiled")
    assert abs(sum(r["class_probabilities"].values()) - 1) < 1e-4
    assert 0 <= r["spoilage_tendency_score"] <= 100
    assert r["training_mode"] == "proxy_real" and r["model_version"].endswith("proxy_real")
    assert "not" in r["warning"].lower()
    for k in ("predicted_class", "class_probabilities", "fruit_type", "model_version", "training_mode", "label_method", "warning"):
        assert k in r


def test_fruit_case_insensitive_and_canonical(svc):
    assert svc.predict({**OK, "fruit_type": "  apple "})["fruit_type"] == "Apple"


def test_unsupported_fruit(svc):
    with pytest.raises(UnsupportedFruitError) as e:
        svc.predict({**OK, "fruit_type": "Mango"})  # exists only in synthetic mode
    assert "Apple" in e.value.details["supported_fruit_types"]


def test_synthetic_mode_supports_more_foods(svc):
    assert svc.predict({**OK, "fruit_type": "Mango"}, "synthetic_demo")["training_mode"] == "synthetic_demo"


@pytest.mark.parametrize("bad", [
    {**OK, "MQ3_raw": -1}, {**OK, "MQ3_raw": 5000}, {**OK, "humidity_pct": 101}, {**OK, "temperature_C": 200},
    {**OK, "MQ135_raw": float("nan")}, {**OK, "MQ135_raw": float("inf")}, {**OK, "MQ3_raw": "2150"},
    {**OK, "MQ3_raw": True}, {**OK, "storage_day": 3}, {**OK, "fruit_type": ""}, {**OK, "fruit_type": 5},
])
def test_invalid_values_rejected(svc, bad):
    with pytest.raises(InvalidInputError):
        svc.predict(bad)


@pytest.mark.parametrize("missing", ["fruit_type", "MQ3_raw", "MQ135_raw", "temperature_C", "humidity_pct"])
def test_missing_field_rejected_not_imputed(svc, missing):
    bad = {k: v for k, v in OK.items() if k != missing}
    with pytest.raises(InvalidInputError) as e:
        svc.predict(bad)
    assert any(p["field"] == missing for p in e.value.details)


def test_all_problems_reported_at_once():
    with pytest.raises(InvalidInputError) as e:
        validate_reading({"fruit_type": "Apple", "MQ3_raw": -1})
    assert len(e.value.details) >= 4


def test_unknown_or_unloaded_mode(svc):
    with pytest.raises(TrainingModeUnavailableError):
        svc.predict(OK, "nope")
    with pytest.raises(TrainingModeUnavailableError):
        svc.predict(OK, "combined_demo")  # valid name but not trained in the fixture run


def test_out_of_training_range_flagged_not_clipped(svc):
    r = svc.predict({**OK, "MQ3_raw": 4000})
    assert "MQ3_raw" in r["out_of_training_range"] and "unreliable" in r["warning"]


def test_saturation_noted(svc):
    assert "saturated" in svc.predict({**OK, "MQ135_raw": 4095})["warning"]


def test_batch_matches_single(svc):
    recs = [OK, {**OK, "fruit_type": "Tomato", "MQ3_raw": 2500}]
    batch = svc.predict_batch(recs)
    assert [b["predicted_class"] for b in batch] == [svc.predict(r)["predicted_class"] for r in recs]


def test_no_models_gives_unavailable(tmp_path):
    s = PredictorService(tmp_path)
    assert s.health()["status"] == "unavailable"
    with pytest.raises(ModelUnavailableError):
        s.predict(OK)


def test_health_and_model_info(svc):
    h = svc.health()
    assert h["status"] == "ok" and h["model_available"] and "proxy_real" in h["loaded_training_modes"]
    info = svc.model_info()
    assert info["capabilities"]["shelf_life_estimation"]["available"] is False
    assert info["models"]["proxy_real"]["supported_fruit_types"] == ["Apple", "Banana", "Tomato"]


def test_fresh_process_loads_saved_artifacts_and_predicts(trained):
    code = ("import json,sys;from app.predictor import PredictorService;"
            "s=PredictorService(sys.argv[1]);"
            "print(json.dumps(s.predict({'fruit_type':'Tomato','MQ3_raw':2300,'MQ135_raw':2900,'temperature_C':30,'humidity_pct':88})))")
    out = subprocess.run([sys.executable, "-c", code, str(trained["models"])], cwd=ROOT, capture_output=True, text=True, check=True)
    r = json.loads(out.stdout)
    assert r["predicted_class"] in ("Fresh", "Semi-Fresh", "Spoiled") and r["fruit_type"] == "Tomato"


@pytest.mark.skipif(not (ROOT / "models" / "proxy_real" / "model.joblib").exists(), reason="shipped model not present")
def test_shipped_model_predicts():
    s = PredictorService(ROOT / "models")
    assert s.health()["default_training_mode"] == "proxy_real"
    assert s.predict(OK)["model_version"] == "1.0.0-proxy_real"
