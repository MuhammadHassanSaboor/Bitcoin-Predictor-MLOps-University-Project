"""Shared paths and settings.

Every value can be overridden with an environment variable, so the same code
runs on a laptop, inside Docker, inside Airflow and inside Kubernetes.
"""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))
MODEL_DIR = Path(os.getenv("MODEL_DIR", PROJECT_ROOT / "models"))

RAW_DATA_PATH = DATA_DIR / "raw" / "btc_raw.csv"
PROCESSED_DATA_PATH = DATA_DIR / "processed" / "btc_features.csv"

MODEL_PATH = MODEL_DIR / "model.pkl"
METRICS_PATH = MODEL_DIR / "metrics.json"
VERSION_PATH = MODEL_DIR / "model_version.txt"
BEST_PARAMS_PATH = MODEL_DIR / "best_params.json"
REGISTRY_PATH = MODEL_DIR / "registry.json"

TICKER = os.getenv("TICKER", "BTC-USD")
START_DATE = os.getenv("START_DATE", "2017-01-01")

# Number of days the model forecasts ahead.
HORIZON = 7

# A new model is only registered (saved for the API) when its MAPE on the
# latest 7-day test window is below this value (in percent).
MAPE_THRESHOLD = float(os.getenv("MAPE_THRESHOLD", "10"))

# Minimum number of past closing prices needed to build features.
MIN_HISTORY = 60


def short_path(path) -> str:
    """Path relative to the project folder (for readable logs)."""
    try:
        return str(Path(path).resolve().relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)
