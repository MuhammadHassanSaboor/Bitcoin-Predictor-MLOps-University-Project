# 11 · Kubernetes Deployment, Autoscaling & Resilience (Part D + E1/E2)

Folder: [`k8s/`](../k8s/) · load test: [`loadtest/locustfile.py`](../loadtest/locustfile.py)

## Manifests

| File | Objects | Requirement |
|---|---|---|
| `configmap-secret.yaml` | ConfigMap `btc-api-config` (`MODEL_STAGE`, `LOG_LEVEL`, `PORT`, `GUNICORN_WORKERS`, `MAPE_THRESHOLD`), Secret `btc-api-secret` (`API_KEY`) | D1: both injected with `envFrom` |
| `pvc.yaml` | PVC `btc-models-pvc`, 1Gi | D2: mounted at `/app/models` |
| `deployment.yaml` | Deployment `btc-forecast-api`, **3 replicas** | D3: liveness `/health` (15s / 10s), readiness `/health`, CPU 100m→500m, memory 128Mi→512Mi, non-root, `fsGroup: 1000`, zero-downtime rolling update |
| `service.yaml` | `btc-forecast-api` (ClusterIP), `btc-forecast-nodeport` (NodePort 30080) | D4: port **80 → 5000** |
| `hpa.yaml` | HPA `btc-forecast-api` | D5: min 2, max 8, CPU 60% |
| `ingress.yaml` | Ingress `btc-forecast` (class `nginx`) | D6: host `btc-forecast.local` |
| `frontend.yaml` | React UI Deployment (2) + Service | bonus: dashboard at `/` |

Notes:
- **Empty PVC:** on start-up the API copies the model baked into the image (`/app/seed_models`) into
  `/app/models`, so the pods answer even before any retraining has run.
- **One Gunicorn worker per pod:** two workers that each load pandas, XGBoost and LightGBM come close to
  the 512Mi limit, so each pod runs one worker and the HPA adds pods instead.
- `tests/test_k8s_manifests.py` checks these values in CI.

## 1. Start the cluster

```powershell
minikube start --driver=docker --cpus=4 --memory=6g
minikube addons enable metrics-server
minikube addons enable ingress
kubectl get nodes
```

## 2. Deploy

```powershell
kubectl apply -f k8s/
kubectl rollout status deployment/btc-forecast-api
kubectl get pods -o wide        # 3 x btc-forecast-api 1/1 Running, 2 x btc-forecast-ui
kubectl get svc
kubectl get pvc                 # Bound
kubectl get configmap,secret
kubectl get hpa
kubectl get ingress
kubectl describe deployment btc-forecast-api   # probes, limits, env from ConfigMap/Secret
```

Check the env vars and the PVC inside a pod:

```powershell
kubectl exec deploy/btc-forecast-api -- env | findstr "MODEL_STAGE LOG_LEVEL PORT API_KEY"
kubectl exec deploy/btc-forecast-api -- ls -l /app/models
```

## 3. Call the live API

```powershell
minikube service btc-forecast-nodeport --url      # keep this terminal open; copy the URL
curl <url>/health
curl -X POST <url>/predict -H "Content-Type: application/json" -d "{\"forecast_days\": 7}"
curl <url>/metrics
```

Run `/health` a few times. The `pod` field changes, which shows the Service is load balancing across the replicas.

## 4. Ingress (D6)

1. Open Notepad as **Administrator** and edit `C:\Windows\System32\drivers\etc\hosts`. Add the line
   `127.0.0.1 btc-forecast.local`
2. Run `minikube tunnel` in a separate admin terminal and leave it running.
3. Test:

```powershell
curl http://btc-forecast.local/health
curl -X POST http://btc-forecast.local/predict -H "Content-Type: application/json" -d "{}"
```

4. Open http://btc-forecast.local in the browser. The React dashboard should show the forecast.

## 5. Autoscaling under load (D5)

```powershell
pip install locust
# terminal 1
kubectl get hpa btc-forecast-api --watch
# terminal 2
kubectl get pods -l app=btc-forecast-api --watch
# terminal 3 (web UI at http://localhost:8089: 200 users, spawn rate 20)
locust -f loadtest/locustfile.py --host <nodeport-url>
```

Headless, saving the results for the report:

```powershell
locust -f loadtest/locustfile.py --host <nodeport-url> --headless -u 200 -r 20 -t 5m `
  --csv Docs/logs/D5_locust --html Docs/logs/D5_locust_report.html
```

What should happen: the HPA starts at 3 replicas and settles at the 2-replica minimum when idle. Under
load, CPU goes above 60% and it adds 2 pods every 30 seconds, up to 8. About 2 minutes after Locust
stops, it removes pods one at a time back to 2. If it does not scale, add more Locust users.
`<unknown>` targets mean metrics-server is still starting, so wait a minute.

## 6. Self-healing (E1)

```powershell
kubectl get pods -l app=btc-forecast-api
kubectl delete pod <one-pod-name>
kubectl get pods -l app=btc-forecast-api --watch
kubectl get events --sort-by=.lastTimestamp | Select-Object -Last 15
```

The ReplicaSet wants N pods. When it sees N-1, it creates a replacement right away. The new pod only
receives traffic after it passes its readiness probe. The other replicas keep serving in the meantime,
so the API stays available. Run `curl <url>/health` during the test to show this.

## 7. End-to-end check (E2)

- [ ] Airflow DAG triggered manually, all 4 tasks green, `/health` shows the new `model_version` ([09](09_AIRFLOW_ETL_DAG.md))
- [ ] GitHub Actions run on `main` is green
- [ ] `curl` to the Kubernetes endpoint returns 7 dates + 7 predicted prices

To serve the Airflow-trained model from Kubernetes, copy it into the PVC and reload the pods:

```powershell
kubectl cp models/model.pkl <pod>:/app/models/model.pkl
kubectl cp models/metrics.json <pod>:/app/models/metrics.json
kubectl rollout restart deployment/btc-forecast-api
```

## Clean up

```powershell
kubectl delete -f k8s/
minikube stop
```

## Evidence to capture

`Docs/screenshots/part-D_kubernetes/`: `D0_nodes.png`, `D1_configmap_secret.png`, `D1_env_in_pod.png`,
`D2_pvc_bound.png`, `D3_get_pods.png`, `D3_describe_deployment.png`, `D4_get_svc.png`,
`D4_predict_nodeport.png`, `D5_hpa_idle.png`, `D5_hpa_scaling_up.png`, `D5_hpa_scaled_down.png`,
`D5_locust_charts.png`, `D6_ingress.png`, `D6_dashboard_ingress.png`

`Docs/screenshots/part-E_verification/`: `E1_before_delete.png`, `E1_pod_deleted.png`,
`E1_new_pod_running.png`, `E2_dag_green.png`, `E2_actions_green.png`, `E2_k8s_predict.png`
