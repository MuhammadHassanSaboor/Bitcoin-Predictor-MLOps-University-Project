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
| `part-B_docker-cicd/B3_actions_run_jobs.png` | B3/B4 · CI/CD run on `main`: lint & tests → React build → Docker build & push (all green) |
| `part-B_docker-cicd/B3_actions_history.png` | B3 · Actions history: workflow runs on PRs and on `main` |
| `part-B_docker-cicd/B3_actions_pr_checks.png` | B3 · Pull request merged with all checks passed |
| `part-B_docker-cicd/B4_dockerhub_tags.png` | B4 · Docker Hub `hassansaboor/btc-forecast-api`: tags `latest` + commit SHA |
| `part-B_docker-cicd/B4_dockerhub_ui_tags.png` | B4 · Docker Hub `hassansaboor/btc-forecast-ui`: tags `latest` + commit SHA |

## React dashboard (extra)

| File | Shows |
|---|---|
| `react-dashboard/terminal_dark.png` | Terminal page: chart, forecast panel, forecast table (dark) |
| `react-dashboard/terminal_light.png` | Terminal page (light) |
| `react-dashboard/terminal_live_ticks.png` | Live tick chart from the market feed |
| `react-dashboard/model_dark.png` / `model_light.png` | Model page: KPIs, model card, backtest, leaderboard |
| `react-dashboard/scenario_dark.png` / `scenario_light.png` | Scenario Lab: custom history → POST /predict |
| `react-dashboard/api_console_dark.png` / `api_console_light.png` | Live API console calling POST /predict |
| `react-dashboard/mobile_dark.png` | Mobile layout |

## Part C: Airflow & Kubeflow

| File | Requirement |
|---|---|
| `part-C_airflow-kubeflow/C1_dag_list.png` | C1 · DAG `btc_etl_pipeline` enabled, schedule `@daily` |
| `part-C_airflow-kubeflow/C1_dag_loaded.png` | C1 · no import errors, 4-task chain |
| `part-C_airflow-kubeflow/C1_trigger.png` | C1/E2 · manual trigger (API model before the run) |
| `part-C_airflow-kubeflow/C1_dag_graph.png` | C1/E2 · Graph view, all 4 tasks green |
| `part-C_airflow-kubeflow/C1_train_log_ui.png`, `C1_train_task_log.png` | C1 · retraining + MAE/RMSE/MAPE, model REGISTERED |
| `part-C_airflow-kubeflow/C1_reload_log_ui.png`, `C1_reload_task_log.png` | C1 · API reload `v20261123-1217 → v20261123-2224` |
| `part-C_airflow-kubeflow/C1_run_success_health.png` | E2 · run succeeded, `/health` + `/metrics` show the new model |
| `part-C_airflow-kubeflow/C2_kfp_compile.png` | C2 · KFP pipeline compiled to YAML |
| `part-C_airflow-kubeflow/C2_kfp_yaml.png` | C2 · compiled spec excerpt |

## Part D: Kubernetes

| File | Requirement |
|---|---|
| `part-D_kubernetes/D0_cluster_and_apply.png` | Minikube node + addons, `kubectl apply -f k8s/` |
| `part-D_kubernetes/D1_configmap_secret.png` | D1 · ConfigMap + Secret, env vars inside the pod |
| `part-D_kubernetes/D2_pvc_bound.png` | D2 · PVC Bound, mounted at `/app/models` |
| `part-D_kubernetes/D3_get_pods.png` | D3 · 3 replicas Running |
| `part-D_kubernetes/D3_describe_deployment.png` | D3 · probes, requests/limits, envFrom, volume |
| `part-D_kubernetes/D4_get_svc.png` | D4 · ClusterIP + NodePort, 80 → 5000 |
| `part-D_kubernetes/D4_predict_nodeport.png` | D4 · live `/predict` (7 days) via NodePort, load balancing |
| `part-D_kubernetes/D5_hpa_watch.png` | D5 · `kubectl get hpa --watch`: 2 → 8 → 2 |
| `part-D_kubernetes/D5_autoscaling_graph.png` | D5 · replicas, CPU and RPS over time |
| `part-D_kubernetes/D5_locust_charts.png`, `D5_locust_stats.png` | D5 · Locust load test |
| `part-D_kubernetes/D6_ingress.png`, `D6_ingress_health_browser.png` | D6 · Ingress `btc-forecast.local` |
| `part-D_kubernetes/D6_dashboard_ingress.png` | D6 · React dashboard served through the Ingress |

## Part E: Verification

| File | Requirement |
|---|---|
| `part-E_verification/E1_pod_deleted_new_pod.png` | E1 · pod deleted, replacement scheduled and Ready |
| `part-E_verification/E1_events_and_availability.png` | E1 · events + 45/45 requests OK during the test |
| `part-E_verification/E2_k8s_model_update.png` | E2 · Airflow-trained model hot-reloaded on all pods, live 7-day forecast |
| `part-E_verification/E2_actions_green.png` | E2 · GitHub Actions CI/CD green on `main` |
