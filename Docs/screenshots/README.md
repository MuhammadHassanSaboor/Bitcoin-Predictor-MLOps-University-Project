# Screenshots & Evidence

Evidence for the PDF report, grouped by assignment part. Terminal screenshots were taken
from real command runs; the full text output of each run is in [`../logs/`](../logs/).

## Model (used in Part A and C)

| File | Shows |
|---|---|
| `ml-model/model_training.png` | `python src/train_forecast.py --tune`: model search result, test metrics, registration |
| `ml-model/etl_and_features.png` | `python src/etl_fetch.py` + `python src/features.py` |

Terminal screenshots are rendered from the exact command and output captured while running them (see `../logs/`).

## Part A: Flask REST API

| File | Requirement |
|---|---|
| `part-A_flask-api/A1_health.png` | A1 · `GET /health` → status ok, uptime, model version |
| `part-A_flask-api/A1_predict.png` | A1 · `POST /predict` → 7 dates + predicted closing prices |
| `part-A_flask-api/A1_predict_custom_history.png` | A1 · `POST /predict` with a custom historical input array |
| `part-A_flask-api/A1_metrics.png` | A1 · `GET /metrics` → MAE, RMSE, MAPE of latest validation |
| `part-A_flask-api/A2_error_handling.png` | A2 · invalid input → 400, unknown route → 404, wrong method → 405 |
| `part-A_flask-api/A3_gunicorn.png` | A3 · API served by Gunicorn inside the container |
| `part-A_flask-api/A3_pytest.png` | A3 · pytest unit tests (all pass) |

## Part B: Docker & CI/CD

| File | Requirement |
|---|---|
| `part-B_docker-cicd/B1_docker_build_api.png` | B1 · multi-stage build output (builder + runtime stages) |
| `part-B_docker-cicd/B1_docker_images.png` | B1 · image sizes |
| `part-B_docker-cicd/B1_non_root_user.png` | B1 · container runs as `appuser`, not root |
| `part-B_docker-cicd/B2_compose_ps.png` | B2 · `docker compose ps`: API, UI, Airflow, Postgres running |
| `part-B_docker-cicd/B2_airflow_ui.png` | B2 · Airflow web UI running from compose |
| `part-B_docker-cicd/B3_actions_pr_checks.png` | B3 · *(take after opening the PR)* lint + tests green |
| `part-B_docker-cicd/B4_dockerhub_tags.png` | B4 · *(take after merging)* Docker Hub tags `latest` + SHA |

## React dashboard (extra)

| File | Shows |
|---|---|
| `react-dashboard/dashboard_dark.png` | Full dashboard, dark theme |
| `react-dashboard/dashboard_light.png` | Full dashboard, light theme |
| `react-dashboard/price_chart.png` | Candlestick chart with MA 7/30, volume and 7-day forecast band |
| `react-dashboard/forecast_panel.png` | Forecast panel close-up |
| `react-dashboard/model_leaderboard.png` | Model leaderboard (CV MAPE) |
| `react-dashboard/whatif_simulator.png` | What-if simulator (custom history → /predict) |

## Parts C, D, E (Mudassar)

Save into `part-C_airflow-kubeflow/`, `part-D_kubernetes/`, `part-E_verification/` using the same naming
(`C1_dag_graph.png`, `D3_get_pods.png`, `D5_hpa_watch.png`, `E1_pod_deleted.png`, …).
