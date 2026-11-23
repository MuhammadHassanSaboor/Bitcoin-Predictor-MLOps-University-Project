# 10 · Kubeflow Pipeline (Part C2)

Files: [`kubeflow/btc_kfp_pipeline.py`](../kubeflow/btc_kfp_pipeline.py) → compiled
[`kubeflow/btc_kfp_pipeline.yaml`](../kubeflow/btc_kfp_pipeline.yaml)

## Design

Written with the **KFP v2 SDK**. It has the same steps as the Airflow DAG, and each step is its own component:

```
ingest_data ──raw_data──▶ generate_features ──features──▶ train_model ──metrics_json──▶ log_metrics
  (Dataset)                  (Dataset)                       │ (Model, Dataset)            (Metrics)
                                                             └──▶ model.pkl artifact
```

| Component | Type | Image | Does |
|---|---|---|---|
| `ingest_data` | `@dsl.container_component` | `hassansaboor/btc-forecast-api` | runs `src.etl_fetch`, outputs the raw CSV as a `Dataset` artifact. Caching is off so every run gets fresh prices |
| `generate_features` | `@dsl.container_component` | same | runs `src.features`, outputs the processed CSV |
| `train_model` | `@dsl.container_component` | same | runs `src.train_forecast` with the saved best params, outputs `model.pkl` (`Model`) and `metrics.json`. CPU 2 / memory 2G limits |
| `log_metrics` | `@dsl.component` (lightweight) | `python:3.10-slim` | logs MAE / RMSE / MAPE / CV MAPE as a `Metrics` artifact so they appear in the Kubeflow UI |

- The container components reuse the API image, which already has `src/` and the exact library
  versions the API uses, so a model trained in Kubeflow loads in the API.
- Data moves between steps as **artifacts** (KFP stores them in its object store and tracks their lineage),
  not through a shared disk.
- Pipeline parameters: `best_params` (JSON taken from `models/best_params.json` at compile time) and
  `mape_threshold` (default 10).

## Compile

```powershell
pip install kfp
python kubeflow/btc_kfp_pipeline.py        # -> kubeflow/btc_kfp_pipeline.yaml
```

## Run on a Kubeflow cluster (optional)

A full Kubeflow install needs 16 GB+ RAM. The assignment only asks for the SDK spec and the
compiled YAML. With a KFP endpoint available:

```powershell
python kubeflow/btc_kfp_pipeline.py --host http://localhost:8080             # one run
python kubeflow/btc_kfp_pipeline.py --host http://localhost:8080 --schedule  # daily at 02:00 UTC
```

You can also upload `btc_kfp_pipeline.yaml` in the KFP UI (*Pipelines → Upload pipeline*).

## Evidence to capture → `Docs/screenshots/part-C_airflow-kubeflow/`

| File | Shows |
|---|---|
| `C2_kfp_compile.png` | terminal: `python kubeflow/btc_kfp_pipeline.py` → compiled |
| `C2_kfp_yaml.png` | the compiled YAML open in VS Code (components + DAG section) |
