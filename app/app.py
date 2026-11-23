"""Flask REST API that serves the 7-day Bitcoin price forecast.

Endpoints
  GET  /health    status, uptime, loaded model version
  POST /predict   7-day (or 1..7 day) forecast, optionally from a custom price history
  GET  /metrics   MAE / RMSE / MAPE of the latest validation run
  GET  /history   recent daily OHLCV + moving averages (used by the dashboard)
  POST /reload    re-read the model from disk (called by Airflow after retraining)

Production:  gunicorn --bind 0.0.0.0:5000 app:app
Local dev:   python app/app.py
"""

from __future__ import annotations

import json
import logging
import math
import os
import shutil
import sys
import threading
import time
from pathlib import Path

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

HERE = Path(__file__).resolve().parent
for p in (HERE, HERE.parent):  # works both in the repo and inside the Docker image
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src import config  # noqa: E402
from src.forecaster import forecast  # noqa: E402

MAX_DAYS = config.HORIZON
MAX_HISTORY = 5000

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("btc-api")


class BadRequest(Exception):
    """Raised for invalid client input -> HTTP 400."""


class ModelStore:
    """Holds the loaded model. Thread-safe so /reload can swap it live."""

    def __init__(self, model_dir: Path, seed_dir: Path | None = None):
        self.model_dir = Path(model_dir)
        self.seed_dir = Path(seed_dir) if seed_dir else None
        self.lock = threading.Lock()
        self.bundle = None
        self.metrics = {}
        self.loaded_at = None

    def _seed_if_empty(self) -> None:
        """If the (possibly empty) volume has no model yet, copy the one baked into the image."""
        target = self.model_dir / "model.pkl"
        if target.exists() or not self.seed_dir or not (self.seed_dir / "model.pkl").exists():
            return
        try:
            self.model_dir.mkdir(parents=True, exist_ok=True)
            for f in self.seed_dir.iterdir():
                if f.is_file():
                    shutil.copy2(f, self.model_dir / f.name)
            log.info("Seeded %s with the model shipped in the image", self.model_dir)
        except OSError as exc:
            log.warning("Could not seed model dir (%s); serving seed model directly", exc)
            self.model_dir = self.seed_dir

    def load(self) -> bool:
        self._seed_if_empty()
        model_path = self.model_dir / "model.pkl"
        if not model_path.exists():
            log.warning("No model found at %s", model_path)
            return False
        bundle = joblib.load(model_path)
        metrics_path = self.model_dir / "metrics.json"
        metrics = json.loads(metrics_path.read_text()) if metrics_path.exists() else {}
        with self.lock:
            self.bundle, self.metrics, self.loaded_at = bundle, metrics, time.time()
        log.info("Loaded model %s (%s)", bundle["version"], bundle["model_name"])
        return True

    def get(self):
        with self.lock:
            return self.bundle, self.metrics


# ----------------------------------------------------------------------------- validation
def parse_predict_payload(payload) -> tuple[int, list[float] | None, str | None]:
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise BadRequest("Request body must be a JSON object")

    days = payload.get("forecast_days", MAX_DAYS)
    if isinstance(days, bool) or not isinstance(days, int):
        raise BadRequest("'forecast_days' must be an integer")
    if not 1 <= days <= MAX_DAYS:
        raise BadRequest(f"'forecast_days' must be between 1 and {MAX_DAYS}")

    history = payload.get("history")
    if history is not None:
        if not isinstance(history, list):
            raise BadRequest("'history' must be a list of closing prices")
        if not config.MIN_HISTORY <= len(history) <= MAX_HISTORY:
            raise BadRequest(
                f"'history' must contain between {config.MIN_HISTORY} and {MAX_HISTORY} prices"
            )
        for v in history:
            if (
                isinstance(v, bool)
                or not isinstance(v, (int, float))
                or not math.isfinite(v)
                or v <= 0
            ):
                raise BadRequest("'history' values must be positive numbers")
        history = [float(v) for v in history]

    last_date = payload.get("last_date")
    if last_date is not None:
        if history is None:
            raise BadRequest("'last_date' can only be used together with 'history'")
        try:
            from datetime import date

            date.fromisoformat(str(last_date))
        except ValueError:
            raise BadRequest("'last_date' must be a date in YYYY-MM-DD format")
    return days, history, last_date


# ----------------------------------------------------------------------------- app
def create_app(model_dir: str | Path | None = None, seed_dir: str | Path | None = None) -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.json.sort_keys = False  # keep fields in the order we write them

    store = ModelStore(
        Path(model_dir or config.MODEL_DIR),
        Path(seed_dir or os.getenv("SEED_MODEL_DIR", HERE / "seed_models")),
    )
    try:
        store.load()
    except Exception:  # never crash the server because of a bad model file
        log.exception("Failed to load model at startup")
    app.extensions["model_store"] = store
    started = time.time()

    def require_model():
        bundle, metrics = store.get()
        if bundle is None:
            return (
                None,
                None,
                (
                    jsonify(error="Service Unavailable", message="No trained model is loaded yet"),
                    503,
                ),
            )
        return bundle, metrics, None

    @app.get("/")
    def index():
        return jsonify(
            service="btc-forecast-api",
            endpoints=["/health", "/predict", "/metrics", "/history", "/reload"],
        )

    @app.get("/health")
    def health():
        bundle, _ = store.get()
        return jsonify(
            status="ok",
            uptime_seconds=round(time.time() - started, 1),
            model_loaded=bundle is not None,
            model_version=bundle["version"] if bundle else None,
            model_name=bundle["model_name"] if bundle else None,
            model_stage=os.getenv("MODEL_STAGE", "production"),
            pod=os.getenv("HOSTNAME", "local"),
        )

    @app.post("/predict")
    def predict():
        try:
            payload = request.get_json(silent=True) if request.data else {}
            if request.data and payload is None:
                raise BadRequest("Request body is not valid JSON")
            days, history, last_date = parse_predict_payload(payload)
            bundle, _, err = require_model()
            if err:
                return err
            preds = forecast(bundle, closes=history, last_date=last_date, days=days)
            base_close = history[-1] if history else bundle["history"]["close"][-1]
            return jsonify(
                model_version=bundle["version"],
                model_name=bundle["model_name"],
                forecast_days=days,
                based_on=("custom_history" if history else "latest_market_data"),
                last_close=round(float(base_close), 2),
                last_date=last_date or (None if history else bundle["history"]["dates"][-1]),
                predictions=preds,
            )
        except BadRequest as exc:
            return jsonify(error="Bad Request", message=str(exc)), 400
        except Exception:
            log.exception("Prediction failed")
            return jsonify(error="Internal Server Error", message="Prediction failed"), 500

    @app.get("/metrics")
    def metrics():
        try:
            bundle, metrics, err = require_model()
            if err:
                return err
            return jsonify(metrics)
        except Exception:
            log.exception("Reading metrics failed")
            return jsonify(error="Internal Server Error", message="Could not read metrics"), 500

    @app.get("/history")
    def history():
        try:
            days = request.args.get("days", "365")
            if not days.isdigit() or not 1 <= int(days) <= 400:
                return jsonify(error="Bad Request", message="'days' must be between 1 and 400"), 400
            bundle, _, err = require_model()
            if err:
                return err
            n = int(days)
            h = bundle["history"]
            return jsonify({k: v[-n:] for k, v in h.items()})
        except Exception:
            log.exception("Reading history failed")
            return jsonify(error="Internal Server Error", message="Could not read history"), 500

    @app.post("/reload")
    def reload():
        api_key = os.getenv("API_KEY")
        if api_key and request.headers.get("X-API-Key") != api_key:
            return jsonify(error="Unauthorized", message="Missing or wrong X-API-Key header"), 401
        try:
            old, _ = store.get()
            if not store.load():
                return jsonify(error="Not Found", message="No model file found to load"), 404
            new, _ = store.get()
            return jsonify(
                status="reloaded",
                previous_version=old["version"] if old else None,
                model_version=new["version"],
            )
        except Exception:
            log.exception("Reload failed")
            return jsonify(error="Internal Server Error", message="Model reload failed"), 500

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException):
        return jsonify(error=exc.name, message=exc.description), exc.code

    @app.errorhandler(Exception)
    def unhandled(exc: Exception):
        log.exception("Unhandled error")
        return jsonify(error="Internal Server Error", message="Something went wrong"), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
