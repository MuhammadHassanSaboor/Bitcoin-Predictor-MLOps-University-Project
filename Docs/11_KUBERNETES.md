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
# terminal 3 (web UI at http://localhost:8089: 100 users, spawn rate 10)
locust -f loadtest/locustfile.py --host <nodeport-url>
```

Headless, saving the results for the report:

```powershell
locust -f loadtest/locustfile.py --host <nodeport-url> --headless -u 100 -r 10 -t 5m `
  --csv Docs/logs/D5_locust --html Docs/logs/D5_locust_report.html
```

Each Locust user waits 1–3 s between calls (6× `/predict`, 2× `/health`, 1× `/metrics`).
`<unknown>` targets mean metrics-server is still starting, so wait a minute.

### Result (Minikube, 4 CPUs / 6 GB, 2026-11-24)

| | Value |
|---|---|
| Load | 100 users, 5 minutes, 9,813 requests |
| Replicas | **2 → 4 → 6 → 8** (max) about 1–2 min after the load started; back to **2** after it stopped |
| HPA CPU metric | peaked at 499% of the 100m request (target 60%) |
| Throughput | ~15 req/s on 2 pods → ~45 req/s on 8 pods |
| Response time p95 | ~7 s on 2 pods → under 1 s on 8 pods |
| Failures | 2.9%, all dropped connections in the Minikube NodePort tunnel on Windows (`RemoteDisconnected` / status 0); no HTTP 5xx from the API |

Evidence: `D5_hpa_watch.png`, `D5_autoscaling_graph.png`, `D5_locust_charts.png`, `D5_locust_stats.png`,
`Docs/logs/D5_*` (Locust CSV + HTML report, HPA watch and 5-second samples).

**What we learned on the first attempt.** The first load test (200 users, 0.1–0.5 s wait) had 36% failures.
It overloaded the tunnel, and the Airflow stack was retraining on the same laptop at the same time. The
liveness probe (5 s timeout, 3 failures) also restarted pods that were only *busy*: in a single-worker
pod, `/health` waits behind CPU-bound `/predict` calls. Every restart moved that pod's load onto the
others, which made things worse. The fix keeps the required `initialDelaySeconds: 15` / `periodSeconds: 10`
but uses `timeoutSeconds: 10` / `failureThreshold: 6`, so only a container that is unresponsive for
about 60 s gets restarted. Readiness still takes a slow pod out of the Service quickly. We also stopped
Airflow during the test and used a more realistic think time.

**Startup spike.** Loading pandas, XGBoost, LightGBM and the model briefly uses more than the 100m CPU
request, so right after a deploy the HPA can add pods before it scales back to 2. A `startupProbe` or a
higher CPU request would reduce this.

## 6. Self-healing (E1)

```powershell
kubectl get pods -l app=btc-forecast-api
kubectl delete pod <one-pod-name>
kubectl get pods -l app=btc-forecast-api --watch
kubectl get events --sort-by=.lastTimestamp | Select-Object -Last 15
```

The ReplicaSet wants N pods. When it sees N-1, it creates a replacement right away. The new pod only
receives traffic after it passes its readiness probe. The other replicas keep serving in the meantime,
so the API stays available.

**Result:** pod `…-8g6fn` was deleted at 03:22:47. Replacement `…-cntgx` was created **within 1 s** and
was `Ready` after **19 s** (model load plus readiness probe). `curl http://btc-forecast.local/health`
every second during the test: **45 / 45 returned 200**, so there was no downtime.
Evidence: `E1_pod_deleted_new_pod.png`, `E1_events_and_availability.png`, `Docs/logs/E1_self_healing.log`.

## 7. End-to-end check (E2)

- [x] Airflow DAG triggered manually, all 4 tasks green; the API went from `v20261123-1217` to `v20261123-2224` ([09](09_AIRFLOW_ETL_DAG.md))
- [x] GitHub Actions run on `main` (commit `8e093dd`, the image Kubernetes runs) is green: `E2_actions_green.png`
- [x] Kubernetes serves the **Airflow-trained** model and `/predict` returns 7 dates + 7 prices: `E2_k8s_model_update.png`

To serve the Airflow-trained model from Kubernetes, copy it into the shared PVC and hot-reload every pod
through `POST /reload` (the `X-API-Key` comes from the Secret):

```powershell
kubectl cp models/model.pkl <pod>:/app/models/model.pkl
kubectl cp models/metrics.json <pod>:/app/models/metrics.json
kubectl cp models/model_version.txt <pod>:/app/models/model_version.txt
# then, for each pod:
kubectl exec <pod> -- python -c "import os,urllib.request as u; print(u.urlopen(u.Request('http://127.0.0.1:5000/reload', method='POST', headers={'X-API-Key': os.environ['API_KEY']})).read())"
```

Pods created later by the HPA load the new model from the PVC on start-up.

## Clean up

```powershell
kubectl delete -f k8s/
minikube stop
```

## Evidence

All terminal screenshots are rendered from the exact command output saved in [`logs/`](logs/).

| Folder | Files |
|---|---|
| `screenshots/part-D_kubernetes/` | `D0_cluster_and_apply`, `D1_configmap_secret`, `D2_pvc_bound`, `D3_get_pods`, `D3_describe_deployment`, `D4_get_svc`, `D4_predict_nodeport`, `D5_hpa_watch`, `D5_autoscaling_graph`, `D5_locust_charts`, `D5_locust_stats`, `D6_ingress`, `D6_ingress_health_browser`, `D6_dashboard_ingress` |
| `screenshots/part-E_verification/` | `E1_pod_deleted_new_pod`, `E1_events_and_availability`, `E2_k8s_model_update`, `E2_actions_green` |
