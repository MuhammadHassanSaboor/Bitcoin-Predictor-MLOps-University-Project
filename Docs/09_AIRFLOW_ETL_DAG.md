# 09 · Airflow ETL DAG (Part C1)

File: [`dags/btc_etl_pipeline.py`](../dags/btc_etl_pipeline.py)

## What it does

A daily DAG (`schedule="@daily"`, `catchup=False`) with four tasks in a chain:

```
fetch_data ──▶ preprocess_features ──▶ train_and_evaluate ──▶ reload_api_model
```

| Task | Calls | Output |
|---|---|---|
| `fetch_data` | `src.etl_fetch.main()` | `$DATA_DIR/raw/btc_raw.csv` (Yahoo Finance, Binance fallback) |
| `preprocess_features` | `src.features.main()` | `$DATA_DIR/processed/btc_features.csv` (MA 7/30, volatility, RSI, 7-day targets) |
| `train_and_evaluate` | `src.train_forecast.main(tune=False)` | MAE / RMSE / MAPE on the latest 7-day test window; the model is written to `$MODEL_DIR` **only if MAPE < `MAPE_THRESHOLD`** (10%) |
| `reload_api_model` | `POST $API_URL/reload` with `X-API-Key` | Flask API swaps to the new model. The task is **skipped** when the model was rejected, and it fails if the API does not end up serving the new version |

Each task returns a small dict, so the results show up in the **XCom** tab. Retries: 2, 2 minutes apart.

## Run it

```powershell
copy .env.example .env          # once
docker compose up -d --build
docker compose ps               # api, ui, postgres, airflow-webserver, airflow-scheduler up
```

1. Open http://localhost:8080 and log in as `admin` / `admin`.
2. Find **btc_etl_pipeline**. DAGs start paused, so switch it **on**.
3. Press ▶ **Trigger DAG**, then open the **Graph** tab and wait until all 4 tasks are green (≈3 min).
4. Check the API picked up the new model:

```powershell
curl http://localhost:5000/health      # model_version = the one in the train_and_evaluate XCom
curl http://localhost:5000/metrics
```

From the CLI instead of the UI:

```powershell
docker compose exec airflow-scheduler airflow dags list-import-errors
docker compose exec airflow-scheduler airflow dags trigger btc_etl_pipeline
docker compose exec airflow-scheduler airflow dags list-runs -d btc_etl_pipeline
```

When you're done, run `docker compose down` to free RAM before starting Minikube.

## Evidence to capture → `Docs/screenshots/part-C_airflow-kubeflow/`

| File | Shows |
|---|---|
| `C1_dag_list.png` | DAG list with `btc_etl_pipeline` enabled, schedule `@daily` |
| `C1_dag_graph.png` | Graph view, all 4 tasks green |
| `C1_train_log.png` | `train_and_evaluate` log: metrics + `REGISTERED` |
| `C1_reload_log.png` | `reload_api_model` log: old version → new version |
| `C1_health_after.png` | `/health` showing the new `model_version` |
