"""Daily BTC-USD ETL + retraining pipeline (Part C1).

    fetch_data -> preprocess_features -> train_and_evaluate -> reload_api_model

fetch_data           pull daily BTC-USD prices (Yahoo Finance, Binance fallback) -> $DATA_DIR/raw
preprocess_features  clean data, add moving averages / volatility / RSI, build 7-day targets
train_and_evaluate   fit the forecaster, score it on the latest 7-day test window and register
                     the model in $MODEL_DIR only if test MAPE < MAPE_THRESHOLD
reload_api_model     POST $API_URL/reload so the Flask service loads the new weights
                     (skipped when the new model did not pass the threshold)

The heavy imports (pandas, xgboost, ...) live inside the tasks so the scheduler can
parse this file quickly.
"""

from __future__ import annotations

import logging
import os
from datetime import timedelta

import pendulum
from airflow.decorators import dag, task
from airflow.exceptions import AirflowSkipException

log = logging.getLogger(__name__)

DEFAULT_ARGS = {
    "owner": "mudassar",
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
    "execution_timeout": timedelta(minutes=30),
}


@dag(
    dag_id="btc_etl_pipeline",
    description="Daily BTC-USD fetch, feature engineering, retraining and API model reload",
    schedule="@daily",
    start_date=pendulum.datetime(2026, 11, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["btc", "etl", "forecasting"],
    doc_md=__doc__,
)
def btc_etl_pipeline():
    @task
    def fetch_data() -> dict:
        from src.etl_fetch import main

        result = main()
        log.info(
            "Fetched %s rows (%s -> %s)", result["rows"], result["first_date"], result["last_date"]
        )
        return result

    @task
    def preprocess_features(raw: dict) -> dict:
        from src.features import main

        result = main()
        log.info(
            "Built %s rows with %s features from %s",
            result["rows"],
            result["features"],
            raw["path"],
        )
        return result

    @task(execution_timeout=timedelta(minutes=45))
    def train_and_evaluate(features: dict) -> dict:
        import json
        import subprocess
        import sys

        # Train in a clean Python process, not inside the Airflow worker:
        #  - Airflow imports `dill`, which patches the pure-Python pickler that joblib uses,
        #    so a model saved here would need dill to load and the API (no dill) would fail.
        #  - sklearn/joblib can only use all CPU cores outside the forked task process.
        # tune=False re-uses models/best_params.json, so the daily run takes a few minutes.
        script = (
            "import json, logging; from src.train_forecast import main; "
            "logging.basicConfig(level=logging.INFO, "
            "format='%(asctime)s %(levelname)s %(name)s: %(message)s'); "
            "print('RESULT=' + json.dumps(main(tune=False)))"
        )
        proc = subprocess.run(
            [sys.executable, "-c", script], capture_output=True, text=True, check=False
        )
        for line in (proc.stderr + proc.stdout).splitlines():
            if "UserWarning" not in line and not line.startswith("RESULT="):
                log.info(line)
        if proc.returncode != 0:
            raise RuntimeError(f"Training process exited with code {proc.returncode}")
        result = json.loads(
            next(ln for ln in proc.stdout.splitlines() if ln.startswith("RESULT="))[7:]
        )
        log.info(
            "Model %s (%s): MAE=%.2f RMSE=%.2f MAPE=%.3f%% registered=%s",
            result["model_version"],
            result["model_name"],
            result["test_mae"],
            result["test_rmse"],
            result["test_mape"],
            result["registered"],
        )
        return result

    @task
    def reload_api_model(train_result: dict) -> dict:
        import requests

        if not train_result["registered"]:
            raise AirflowSkipException(
                f"Model {train_result['model_version']} failed the MAPE threshold; "
                "API keeps serving the previous model"
            )

        api_url = os.environ.get("API_URL", "http://api:5000").rstrip("/")
        resp = requests.post(
            f"{api_url}/reload",
            headers={"X-API-Key": os.environ.get("API_KEY", "")},
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        log.info("API reloaded: %s -> %s", body.get("previous_version"), body.get("model_version"))

        if body.get("model_version") != train_result["model_version"]:
            raise RuntimeError(
                f"API is serving {body.get('model_version')}, "
                f"expected {train_result['model_version']}"
            )
        return body

    reload_api_model(train_and_evaluate(preprocess_features(fetch_data())))


btc_etl_pipeline()
