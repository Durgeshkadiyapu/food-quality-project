"""Service settings (environment variables; see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Physical validity limits of the actual hardware. Values outside these are rejected, never clipped.
SENSOR_LIMITS = {
    "MQ3_raw": {"min": 0.0, "max": 4095.0, "unit": "ADC counts (ESP32 12-bit)"},
    "MQ135_raw": {"min": 0.0, "max": 4095.0, "unit": "ADC counts (ESP32 12-bit)"},
    "temperature_C": {"min": -40.0, "max": 80.0, "unit": "degrees Celsius (DHT22 range)"},
    "humidity_pct": {"min": 0.0, "max": 100.0, "unit": "percent relative humidity (DHT22 range)"},
}
TRAINING_MODES = ("proxy_real", "synthetic_demo", "combined_demo")


def _split(v: str) -> list[str]:
    return [x.strip() for x in v.split(",") if x.strip()]


@dataclass
class Settings:
    models_dir: Path = field(default_factory=lambda: Path(os.environ.get("MODELS_DIR", ROOT / "models")))
    default_training_mode: str = field(default_factory=lambda: os.environ.get("DEFAULT_TRAINING_MODE", "proxy_real"))
    # Restrict to your React dev/prod origins before deploying, e.g. "http://localhost:5173,https://app.example.com"
    cors_origins: list[str] = field(default_factory=lambda: _split(
        os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")))
    max_batch_size: int = field(default_factory=lambda: int(os.environ.get("MAX_BATCH_SIZE", "500")))


def get_settings() -> Settings:
    return Settings()
