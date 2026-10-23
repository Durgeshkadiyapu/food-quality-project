"""Pydantic v2 request/response schemas (the API contract; see API_CONTRACT.md)."""
from __future__ import annotations

from typing import Annotated, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .config import SENSOR_LIMITS

TrainingMode = Literal["proxy_real", "synthetic_demo", "combined_demo"]


def _num(name: str):
    lim = SENSOR_LIMITS[name]
    # strict: JSON numbers only (no "2150" strings, no booleans); NaN/Infinity rejected; physical range enforced.
    return Annotated[float, Field(strict=True, allow_inf_nan=False, ge=lim["min"], le=lim["max"],
                                  description=lim["unit"])]


class SensorReading(BaseModel):
    model_config = ConfigDict(extra="forbid")  # e.g. `storage_day` is rejected, never silently used
    fruit_type: str = Field(min_length=1, examples=["Apple"])
    MQ3_raw: _num("MQ3_raw") = Field(examples=[2150])
    MQ135_raw: _num("MQ135_raw") = Field(examples=[1800])
    temperature_C: _num("temperature_C") = Field(examples=[28.5])
    humidity_pct: _num("humidity_pct") = Field(examples=[75.0])


class PredictRequest(SensorReading):
    training_mode: Optional[TrainingMode] = Field(
        default=None, description="Which trained model to use. Omit for the server default (proxy_real).")


class BatchPredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    training_mode: Optional[TrainingMode] = None
    records: List[SensorReading] = Field(min_length=1)


class PredictResponse(BaseModel):
    predicted_class: Literal["Fresh", "Semi-Fresh", "Spoiled"]
    class_probabilities: Dict[str, float]
    fruit_type: str
    model_version: str
    training_mode: TrainingMode
    label_method: str
    warning: str
    spoilage_tendency_score: float = Field(description="0-100 demo score from class scores; NOT a food-safety risk")
    out_of_training_range: List[str]


class BatchItem(BaseModel):
    index: int
    predicted_class: Literal["Fresh", "Semi-Fresh", "Spoiled"]
    class_probabilities: Dict[str, float]
    fruit_type: str
    spoilage_tendency_score: float
    out_of_training_range: List[str]
    warning: str


class BatchPredictResponse(BaseModel):
    count: int
    model_version: str
    training_mode: TrainingMode
    label_method: str
    warning: str
    predictions: List[BatchItem]


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[object] = None


class ErrorResponse(BaseModel):
    error: ErrorBody
