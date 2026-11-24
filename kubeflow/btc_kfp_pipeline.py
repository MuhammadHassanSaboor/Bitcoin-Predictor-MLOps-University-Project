"""Kubeflow Pipelines (KFP v2) version of the BTC forecasting pipeline (Part C2).

    ingest_data -> generate_features -> train_model -> log_metrics

The first three steps are container components that run inside the API image
(it already ships src/ and every ML library). Data moves between steps as KFP
artifacts, so Kubeflow tracks each CSV, the model file and its metrics.

Compile to YAML (no cluster needed):
    python kubeflow/btc_kfp_pipeline.py
        -> kubeflow/btc_kfp_pipeline.yaml

Optionally upload it to a running Kubeflow and schedule it daily:
    python kubeflow/btc_kfp_pipeline.py --host http://localhost:8080 --schedule
"""

# No `from __future__ import annotations` here: KFP reads the real type hints.
import argparse
import json
from pathlib import Path

from kfp import compiler, dsl
from kfp.dsl import Dataset, Input, Metrics, Model, Output

HERE = Path(__file__).resolve().parent
PACKAGE_PATH = HERE / "btc_kfp_pipeline.yaml"
BEST_PARAMS_PATH = HERE.parent / "models" / "best_params.json"

IMAGE = "hassansaboor/btc-forecast-api:latest"

# Hyper-parameters found by `train_forecast.py --tune`. Passed in as a pipeline
# parameter so daily runs skip the slow search (same as the Airflow DAG).
DEFAULT_BEST_PARAMS = (
    json.dumps(json.loads(BEST_PARAMS_PATH.read_text())) if BEST_PARAMS_PATH.exists() else "{}"
)


@dsl.container_component
def ingest_data(raw_data: Output[Dataset]):
    """Download daily BTC-USD prices with src/etl_fetch.py."""
    return dsl.ContainerSpec(
        image=IMAGE,
        command=["sh", "-ec"],
        args=[
            """
            export DATA_DIR=/tmp/work/data
            python -c "from src.etl_fetch import main; print(main())"
            mkdir -p "$(dirname "$0")"
            cp "$DATA_DIR/raw/btc_raw.csv" "$0"
            """,
            raw_data.path,
        ],
    )


@dsl.container_component
def generate_features(raw_data: Input[Dataset], features: Output[Dataset]):
    """Clean the raw prices and add moving averages, volatility and 7-day targets."""
    return dsl.ContainerSpec(
        image=IMAGE,
        command=["sh", "-ec"],
        args=[
            """
            export DATA_DIR=/tmp/work/data
            mkdir -p "$DATA_DIR/raw"
            cp "$0" "$DATA_DIR/raw/btc_raw.csv"
            python -c "from src.features import main; print(main())"
            mkdir -p "$(dirname "$1")"
            cp "$DATA_DIR/processed/btc_features.csv" "$1"
            """,
            raw_data.path,
            features.path,
        ],
    )


@dsl.container_component
def train_model(
    features: Input[Dataset],
    best_params: str,
    mape_threshold: float,
    model: Output[Model],
    metrics_json: Output[Dataset],
):
    """Train the 7-day forecaster, evaluate on the last 7 days and export the artifacts."""
    return dsl.ContainerSpec(
        image=IMAGE,
        command=["sh", "-ec"],
        args=[
            """
            export DATA_DIR=/tmp/work/data MODEL_DIR=/tmp/work/models MAPE_THRESHOLD="$3"
            mkdir -p "$DATA_DIR/processed" "$MODEL_DIR" "$(dirname "$1")" "$(dirname "$2")"
            cp "$0" "$DATA_DIR/processed/btc_features.csv"
            printf '%s' "$4" > "$MODEL_DIR/best_params.json"
            python -c "from src.train_forecast import main; print(main(tune=False))"
            if [ -f "$MODEL_DIR/model.pkl" ]; then
                cp "$MODEL_DIR/model.pkl" "$1"
                cp "$MODEL_DIR/metrics.json" "$2"
            else
                echo "Model rejected by the MAPE threshold; exporting its metrics only"
                : > "$1"
                cp "$MODEL_DIR/rejected_metrics.json" "$2"
            fi
            """,
            features.path,
            model.path,
            metrics_json.path,
            mape_threshold,
            best_params,
        ],
    )


@dsl.component(base_image="python:3.10-slim")
def log_metrics(metrics_json: Input[Dataset], metrics: Output[Metrics]) -> bool:
    """Publish MAE / RMSE / MAPE to the Kubeflow UI and return whether the model passed."""
    import json

    with open(metrics_json.path) as f:
        m = json.load(f)
    metrics.log_metric("mae", m["mae"])
    metrics.log_metric("rmse", m["rmse"])
    metrics.log_metric("mape", m["mape"])
    metrics.log_metric("naive_mape", m["baseline_naive"]["mape"])
    metrics.log_metric("cv_mape", m["cv"]["mape"])
    metrics.metadata["model_version"] = m["model_version"]
    metrics.metadata["model_name"] = m["model_name"]
    print(json.dumps({k: m[k] for k in ("model_version", "mae", "rmse", "mape")}, indent=2))
    return bool(m["registered"])


@dsl.pipeline(
    name="btc-7day-forecast",
    description="Daily BTC-USD ingestion, feature generation and 7-day forecast model training",
)
def btc_forecast_pipeline(
    best_params: str = DEFAULT_BEST_PARAMS,
    mape_threshold: float = 10.0,
):
    ingest = ingest_data().set_display_name("Ingest BTC-USD data")
    ingest.set_caching_options(False)  # always fetch today's prices

    feats = generate_features(raw_data=ingest.outputs["raw_data"]).set_display_name(
        "Generate features"
    )

    train = train_model(
        features=feats.outputs["features"],
        best_params=best_params,
        mape_threshold=mape_threshold,
    ).set_display_name("Train & evaluate model")
    train.set_cpu_limit("2").set_memory_limit("2G")

    log_metrics(metrics_json=train.outputs["metrics_json"]).set_display_name("Log metrics")


def compile_pipeline(path: Path = PACKAGE_PATH) -> Path:
    compiler.Compiler().compile(btc_forecast_pipeline, package_path=str(path))
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", help="Kubeflow Pipelines endpoint to upload the pipeline to")
    parser.add_argument("--schedule", action="store_true", help="create a daily recurring run")
    args = parser.parse_args()

    path = compile_pipeline()
    print(f"Compiled pipeline -> {path}")

    if not args.host:
        return

    import kfp

    client = kfp.Client(host=args.host)
    experiment = client.create_experiment("btc-forecast")
    if args.schedule:
        job = client.create_recurring_run(
            experiment_id=experiment.experiment_id,
            job_name="btc-forecast-daily",
            cron_expression="0 0 2 * * *",  # every day at 02:00 UTC
            pipeline_package_path=str(path),
            max_concurrency=1,
        )
        print(f"Created recurring run {job.recurring_run_id}")
    else:
        run = client.create_run_from_pipeline_package(
            str(path), arguments={}, experiment_name="btc-forecast"
        )
        print(f"Started run {run.run_id}")


if __name__ == "__main__":
    main()
