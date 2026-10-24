"""FastAPI inference service. Run: uvicorn app.main:app --port 8000

Routes are thin wrappers over app.predictor (which holds all logic and is unit-tested without FastAPI).
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .predictor import PredictionError, PredictorService
from .schemas import (BatchPredictRequest, BatchPredictResponse, ErrorResponse, PredictRequest,
                      PredictResponse)

ERR = {422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}}


def _error(status: int, code: str, message: str, details=None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "details": details}})


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.service = PredictorService(settings.models_dir, settings.default_training_mode)
        yield

    app = FastAPI(title="Food Quality ML Service", version="1.0.0", lifespan=lifespan,
                  description="Demonstration freshness classifier for ESP32 MQ-3/MQ-135/DHT22 readings. "
                              "Labels are assumed (storage-day proxy or synthetic), not verified freshness.")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False,
                       allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

    @app.exception_handler(PredictionError)
    async def _pred_err(_: Request, exc: PredictionError):
        return _error(exc.status, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _val_err(_: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "problem": e["msg"], "type": e["type"]}
                   for e in exc.errors()]
        return _error(422, "validation_error", "Request validation failed", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http_err(_: Request, exc: StarletteHTTPException):
        return _error(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled_err(_: Request, exc: Exception):
        return _error(500, "internal_error", "An internal error occurred", None)

    @app.get("/health")
    def health(request: Request):
        return request.app.state.service.health()

    @app.get("/model-info")
    @app.get("/capabilities")
    def model_info(request: Request):
        return request.app.state.service.model_info()

    @app.post("/predict", response_model=PredictResponse, responses=ERR)
    def predict(body: PredictRequest, request: Request):
        reading = body.model_dump(exclude={"training_mode"})
        return request.app.state.service.predict(reading, body.training_mode)

    @app.post("/explain", responses=ERR)
    def explain(body: PredictRequest, request: Request):
        reading = body.model_dump(exclude={"training_mode"})
        return request.app.state.service.get(body.training_mode).explain(reading)

    @app.post("/predict/batch", response_model=BatchPredictResponse, responses=ERR)
    def predict_batch(body: BatchPredictRequest, request: Request):
        if len(body.records) > settings.max_batch_size:
            return _error(413, "batch_too_large", f"at most {settings.max_batch_size} records per request",
                          {"received": len(body.records)})
        svc: PredictorService = request.app.state.service
        bundle = svc.get(body.training_mode)
        results = bundle.predict_records([r.model_dump() for r in body.records])
        first = results[0]
        return {
            "count": len(results), "model_version": first["model_version"], "training_mode": first["training_mode"],
            "label_method": first["label_method"], "warning": bundle.metadata["warning"],
            "predictions": [{"index": i, **{k: r[k] for k in ("predicted_class", "class_probabilities", "fruit_type",
                                                              "spoilage_tendency_score", "out_of_training_range", "warning")}}
                            for i, r in enumerate(results)],
        }

    return app


app = create_app()
