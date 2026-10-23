"""HTTP-level tests. Require fastapi + httpx (see requirements.txt); skipped automatically if absent."""
import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient  # noqa: E402

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

OK = {"fruit_type": "Apple", "MQ3_raw": 2150, "MQ135_raw": 1800, "temperature_C": 28.5, "humidity_pct": 75.0}


@pytest.fixture(scope="module")
def client(trained):
    with TestClient(create_app(Settings(models_dir=trained["models"], max_batch_size=3))) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_model_info(client):
    j = client.get("/model-info").json()
    assert "proxy_real" in j["models"] and j["capabilities"]["shelf_life_estimation"]["available"] is False


def test_capabilities_alias(client):
    j_info = client.get("/model-info").json()
    j_cap = client.get("/capabilities").json()
    assert j_cap == j_info


def test_predict(client):
    r = client.post("/predict", json=OK)
    assert r.status_code == 200
    j = r.json()
    assert set(j) >= {"predicted_class", "class_probabilities", "fruit_type", "model_version", "training_mode", "label_method", "warning"}
    assert j["predicted_class"] in ("Fresh", "Semi-Fresh", "Spoiled")
    assert abs(sum(j["class_probabilities"].values()) - 1.0) < 1e-4


def test_predict_all_real_foods(client):
    for food in ("Apple", "Banana", "Tomato"):
        r = client.post("/predict", json={**OK, "fruit_type": food})
        assert r.status_code == 200
        assert r.json()["fruit_type"] == food
        assert r.json()["predicted_class"] in ("Fresh", "Semi-Fresh", "Spoiled")


def test_predict_synthetic_mode(client):
    r = client.post("/predict", json={**OK, "fruit_type": "Banana", "training_mode": "synthetic_demo"})
    assert r.status_code == 200
    assert r.json()["training_mode"] == "synthetic_demo"


def test_predict_out_of_range_and_saturation(client):
    r = client.post("/predict", json={**OK, "MQ135_raw": 4095, "temperature_C": 55.0})
    assert r.status_code == 200
    j = r.json()
    assert "temperature_C" in j["out_of_training_range"]
    assert "saturated" in j["warning"]


def test_predict_rejects_extra_fields(client):
    r = client.post("/predict", json={**OK, "storage_day": 3})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


def test_predict_errors_use_stable_error_format(client):
    for body, status, code in [
        ({k: v for k, v in OK.items() if k != "MQ3_raw"}, 422, "validation_error"),
        ({**OK, "humidity_pct": 150}, 422, "validation_error"),
        ({**OK, "MQ3_raw": "abc"}, 422, "validation_error"),
        ({**OK, "fruit_type": "Mango"}, 422, "unsupported_fruit_type"),
        ({**OK, "training_mode": "combined_demo"}, 422, "training_mode_unavailable"),
    ]:
        r = client.post("/predict", json=body)
        assert r.status_code == status and r.json()["error"]["code"] == code, (body, r.text)


def test_batch_and_limit(client):
    r = client.post("/predict/batch", json={"records": [OK, OK]})
    assert r.status_code == 200 and r.json()["count"] == 2 and r.json()["predictions"][1]["index"] == 1
    assert client.post("/predict/batch", json={"records": [OK] * 4}).status_code == 413
    assert client.post("/predict/batch", json={"records": []}).status_code == 422


def test_cors_preflight(client):
    r = client.options("/predict", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
