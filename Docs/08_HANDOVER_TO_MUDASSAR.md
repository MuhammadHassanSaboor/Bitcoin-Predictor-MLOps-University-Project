# 08 · Handover: What Mudassar Needs (Airflow · Kubeflow · Kubernetes)

Everything from Hassan's part that your part plugs into.

## 1. Start from the merged code

```powershell
git checkout main
git pull
git checkout -b mudassar-zulfiqar/etl-kubeflow-k8s
conda create -n btc_mlops python=3.10 -y
conda activate btc_mlops
pip install -r requirements-dev.txt
```

## 2. Python functions to call (Airflow DAG + Kubeflow)

All in `src/`. Each `main()` returns a small dict (good for XCom / logs).

| Step | Call | Reads | Writes |
|---|---|---|---|
| Fetch | `from src.etl_fetch import main` → `main()` | Yahoo Finance (Binance fallback) | `$DATA_DIR/raw/btc_raw.csv` |
| Features | `from src.features import main` → `main()` | raw CSV | `$DATA_DIR/processed/btc_features.csv` |
| Train + evaluate + register | `from src.train_forecast import main` → `main(tune=False)` | processed CSV | `$MODEL_DIR/model.pkl`, `metrics.json`, `model_version.txt`, `registry.json` |

- `main(tune=False)` re-uses the best hyper-parameters in `models/best_params.json` (≈2 min, tested inside the Airflow container).
  `main(tune=True)` runs the full search (≈6–11 min). Use `tune=False` in the daily DAG.
- The result dict has `"registered": true/false`. The model is only saved when the test MAPE is below
  `MAPE_THRESHOLD` (default 10%). Your DAG can log it or skip the reload when it is `false`.
- Paths come from env vars `DATA_DIR` and `MODEL_DIR`. docker-compose already sets them
  (`/opt/airflow/data`, `/opt/airflow/models`) and `PYTHONPATH=/opt/airflow`, so `import src...` works.

### Reload task (last DAG task)

```python
import os, requests
resp = requests.post(
    f"{os.environ['API_URL']}/reload",               # http://api:5000 in compose
    headers={"X-API-Key": os.environ.get("API_KEY", "")},
    timeout=30,
)
resp.raise_for_status()
print(resp.json())   # {"status": "reloaded", "previous_version": "...", "model_version": "..."}
```

### Run Airflow locally

```powershell
copy .env.example .env
docker compose up -d --build
# http://localhost:8080  (admin / admin)   – put your DAG file in dags/btc_etl_pipeline.py
```

## 3. Docker images

After the PR is merged into `main`, GitHub Actions pushes:

| Image | Port | Notes |
|---|---|---|
| `hassansaboor/btc-forecast-api:latest` (also `:<git-sha>`) | 5000 | Flask + Gunicorn, runs as uid **1000** |
| `hassansaboor/btc-forecast-ui:latest` | 8080 | React + Nginx, runs as uid 101 |

The API image also contains `src/` and all ML libraries, so **Kubeflow components can use it** as their
base image, e.g. `python -c "from src.etl_fetch import main; print(main())"`.

## 4. API container facts for Kubernetes manifests

| Item | Value |
|---|---|
| Container port | `5000` |
| Liveness / readiness | `GET /health` (always 200 while the process is alive; `model_loaded` tells if a model is in memory) |
| Model folder (mount the PVC here) | `/app/models` |
| Seed model inside image | `/app/seed_models`: copied into `/app/models` automatically when the PVC is empty, so **no init container is needed** |
| Volume permissions | add `securityContext: { fsGroup: 1000 }` to the pod spec so `appuser` can write to the PVC |
| Env vars read (ConfigMap) | `PORT` (5000), `LOG_LEVEL` (INFO), `MODEL_STAGE` (production), `GUNICORN_WORKERS` (2) |
| Env vars read (Secret) | `API_KEY`: required as `X-API-Key` header by `POST /reload` |
| Shows pod name | `GET /health` returns `"pod": "<HOSTNAME>"`, useful to prove load balancing |

UI container: port `8080`, env `API_UPSTREAM=<api-service-name>:80`, health `GET /healthz`.

## 5. Endpoints to test after deploying

```powershell
curl http://<url>/health
curl -X POST http://<url>/predict -H "Content-Type: application/json" -d "{\"forecast_days\": 7}"
curl http://<url>/metrics
```
Full API reference: [03_FLASK_API.md](03_FLASK_API.md)

## 6. Lint rules your Python files must pass (CI)

```powershell
black dags kubeflow loadtest
flake8 .
```
Line length is 100 (see `pyproject.toml`, `.flake8`).
