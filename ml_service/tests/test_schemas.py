import pytest
from pydantic import ValidationError

from app.schemas import BatchPredictRequest, PredictRequest

OK = {"fruit_type": "Apple", "MQ3_raw": 2150, "MQ135_raw": 1800, "temperature_C": 28.5, "humidity_pct": 75.0}


def test_valid_request():
    assert PredictRequest(**OK).training_mode is None
    assert PredictRequest(**OK, training_mode="synthetic_demo").training_mode == "synthetic_demo"


@pytest.mark.parametrize("bad", [
    {**OK, "MQ3_raw": "2150"}, {**OK, "MQ3_raw": True}, {**OK, "MQ3_raw": float("nan")}, {**OK, "humidity_pct": 101},
    {**OK, "MQ135_raw": -1}, {**OK, "storage_day": 3}, {**OK, "training_mode": "x"}, {**OK, "fruit_type": ""},
])
def test_invalid_requests(bad):
    with pytest.raises(ValidationError):
        PredictRequest(**bad)


def test_missing_field():
    with pytest.raises(ValidationError):
        PredictRequest(**{k: v for k, v in OK.items() if k != "MQ3_raw"})


def test_batch_requires_records():
    with pytest.raises(ValidationError):
        BatchPredictRequest(records=[])
    assert len(BatchPredictRequest(records=[OK, OK]).records) == 2
