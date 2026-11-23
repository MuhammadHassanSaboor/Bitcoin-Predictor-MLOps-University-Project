"""Shared test fixtures.

The tests never touch the internet: they train a tiny model on a synthetic
random-walk price series and point the API at it.
"""

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "app"))

from src.features import build_dataset, feature_names  # noqa: E402
from src.forecaster import make_model  # noqa: E402


def synthetic_prices(n_days: int = 600, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    close = 30000 * np.exp(np.cumsum(rng.normal(0.001, 0.03, n_days)))
    dates = pd.date_range("2023-01-01", periods=n_days, freq="D")
    return pd.DataFrame(
        {
            "Date": dates,
            "Open": close * 0.99,
            "High": close * 1.02,
            "Low": close * 0.98,
            "Close": close,
            "Volume": rng.uniform(1e9, 5e9, n_days),
        }
    )


@pytest.fixture(scope="session")
def raw_prices() -> pd.DataFrame:
    return synthetic_prices()


@pytest.fixture(scope="session")
def model_dir(tmp_path_factory, raw_prices) -> Path:
    data = build_dataset(raw_prices).dropna()
    feats = feature_names()
    targets = [f"target_h{h}" for h in range(1, 8)]
    model = make_model("ridge", {"alpha": 10.0}).fit(data[feats].values, data[targets].values)

    tail = raw_prices.tail(400)
    bundle = {
        "model": model,
        "model_name": "Ridge Regression",
        "family": "ridge",
        "params": {"alpha": 10.0},
        "feature_names": feats,
        "horizon": 7,
        "interval": {"lower": [-0.05] * 7, "upper": [0.05] * 7},
        "version": "v-test",
        "trained_at": "2025-01-01T00:00:00+00:00",
        "history": {
            "dates": tail["Date"].dt.strftime("%Y-%m-%d").tolist(),
            "open": tail["Open"].tolist(),
            "high": tail["High"].tolist(),
            "low": tail["Low"].tolist(),
            "close": tail["Close"].tolist(),
            "volume": tail["Volume"].tolist(),
        },
    }
    out = tmp_path_factory.mktemp("models")
    joblib.dump(bundle, out / "model.pkl")
    (out / "metrics.json").write_text(
        json.dumps({"model_version": "v-test", "mae": 100.0, "rmse": 150.0, "mape": 1.5})
    )
    return out


@pytest.fixture()
def client(model_dir, monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)
    from app import create_app

    app = create_app(model_dir=model_dir, seed_dir=model_dir / "none")
    app.config["TESTING"] = True
    return app.test_client()


@pytest.fixture()
def empty_client(tmp_path):
    from app import create_app

    app = create_app(model_dir=tmp_path, seed_dir=tmp_path / "none")
    return app.test_client()
