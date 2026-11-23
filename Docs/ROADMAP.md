# 🗺️ Project Roadmap — Bitcoin 7-Day Price Predictor (MLOps Assignment 3)

**Team & responsibilities**

| Name | Roll No | Owns |
|---|---|---|
| **Hassan** — Muhammad Hassan Saboor | 25L-8014 | 📊 Data · 🤖 ML model · 🌐 Flask API · ⚛️ React UI · 🐳 Docker · ⚙️ CI/CD |
| **Mudassar** — Mudassar Zulfiqar | 24L-8000 | 🔁 ETL (Airflow) · 🧪 Kubeflow · ☸️ Kubernetes |

**Goal:** Finish the whole assignment **today** (one long working day, about 10 hours).
**Total marks:** 60

> 💡 **How to read this file:** First read Part 0 together. Then each person follows **their own track**: Hassan → 🟦 **Track H**, Mudassar → 🟩 **Track M**. Each step says **what** to do, **why**, and **how to check it worked** (✅). The 🔄 **SYNC POINT** boxes are moments where one person must give something to the other. Don't skip them.

---

## 📖 Part 0 — What are we actually building? (Both, 10 minutes)

In one sentence: **a website + API that tells you Bitcoin's closing price for the next 7 days, and everything around it runs automatically.**

Think of it like a restaurant:

| Restaurant | Our project | Tool we use | Owner |
|---|---|---|---|
| Buying fresh vegetables | Download Bitcoin prices | **Python + yfinance** | Hassan |
| The chef learning a recipe | Training the ML model | **XGBoost** | Hassan |
| The waiter who takes orders | The API that answers "what's the price next week?" | **Flask** | Hassan |
| The menu card customers see | A nice web page with a chart | **React** | Hassan |
| Packing food in lunch boxes | Packing our app so it runs on any computer | **Docker** | Hassan |
| A quality inspector for every new dish | Every code push is tested + packed automatically | **GitHub Actions** | Hassan |
| The manager's daily checklist | Running "download → clean → train → reload" every day | **Airflow** | Mudassar |
| A second style of checklist | Same pipeline, written for another tool | **Kubeflow (KFP)** | Mudassar |
| A restaurant chain with many branches | Running many copies of our app; if one dies a new one starts | **Kubernetes (Minikube)** | Mudassar |

### 🔗 How our two tracks connect

```
 HASSAN                                         MUDASSAR
 ───────                                        ────────
 src/ (data + model code) ───────────────────▶  used by Airflow DAG + Kubeflow
 Flask API ──▶ Docker image ──▶ Docker Hub ───▶  used by Kubernetes deployment
 React UI  ──▶ Docker image ──▶ Docker Hub ───▶  used by Kubernetes deployment
 docker-compose.yml (API + Airflow + Postgres) ▶ Mudassar runs his DAG inside it
 /reload endpoint in Flask  ◀───────────────────  Airflow calls it after retraining
```

### 🧠 Simple dictionary of words you will see

| Word | Simple meaning |
|---|---|
| **API** | A URL your program can call to get data back (e.g. `/predict` gives prices). |
| **Endpoint** | One URL of the API, like `/health` or `/predict`. |
| **JSON** | The text format the API replies in: `{"price": 95000}`. |
| **Gunicorn** | A strong "engine" that runs Flask in production (Flask alone is only for testing). |
| **pytest** | A tool that runs automatic tests on our code. |
| **React** | A JavaScript library for building web pages. |
| **Vite / npm** | Tools that create and build a React project. |
| **Docker image** | A frozen "lunch box" containing code + Python + libraries. |
| **Container** | A running copy of an image. |
| **Dockerfile** | The recipe used to build an image. |
| **Multi-stage Dockerfile** | Recipe with 2 steps: step 1 installs/builds, step 2 copies only what's needed → smaller image. |
| **Docker Hub** | Like GitHub, but for Docker images. |
| **docker-compose** | Starts several containers together with one command. |
| **CI/CD** | Automatic testing + automatic building on every push. |
| **GitHub Secrets** | A safe place in GitHub to store passwords (so they are not in the code). |
| **Linting (flake8/black)** | Automatic checking that code is neat and has no obvious mistakes. |
| **ETL** | Extract (download) → Transform (clean) → Load (save). |
| **DAG** | A list of tasks with arrows showing their order (task 1 → task 2 → task 3). |
| **Kubernetes (K8s)** | A system that runs and looks after many containers. |
| **Minikube** | A small Kubernetes that runs on your own laptop. |
| **kubectl** | The command you type to talk to Kubernetes. |
| **Pod** | One running copy of our app inside Kubernetes. |
| **Deployment** | Tells K8s "always keep 3 pods of my app running". |
| **Service** | A fixed address that sends traffic to the pods. |
| **ConfigMap / Secret** | Settings (normal / secret) given to the app from outside the code. |
| **PVC** | A storage disk for pods, so files (our model) are not lost when a pod restarts. |
| **HPA** | Autoscaler: adds pods when the app is busy, removes them when it's quiet. |
| **Ingress** | A "front door" so we can open the app with a nice name like `http://btc-forecast.local`. |
| **Probe** | K8s regularly calls `/health` to check the app is alive. |
| **Locust** | A tool that sends lots of fake users to our API (load testing). |
| **MAE / RMSE / MAPE** | Numbers that show how wrong the predictions are (smaller = better). |

---

## 🧰 Part 1 — Install everything (Both, ~1 hour) ⏰ 9:00 – 10:00

Both laptops need the **common** tools. Then each person installs their **extra** tools.

| # | Install | Who | Why | Check (type in terminal) |
|---|---|---|---|---|
| 1 | **Git** — https://git-scm.com | Both | Save and share code | `git --version` |
| 2 | **Miniconda** — https://docs.conda.io/en/latest/miniconda.html | Both | Python + project environment | `conda --version` |
| 3 | **VS Code** | Both | Write code | — |
| 4 | **Docker Desktop** — https://docker.com (enable **WSL 2**, then restart PC) | Both | Build/run containers | `docker run hello-world` |
| 5 | **Node.js LTS** — https://nodejs.org | Hassan | Build the React app | `node -v` and `npm -v` |
| 6 | **Minikube** — https://minikube.sigs.k8s.io/docs/start/ | Mudassar | Local Kubernetes | `minikube version` |
| 7 | **kubectl** — `winget install Kubernetes.kubectl` | Mudassar | Control Kubernetes | `kubectl version --client` |
| 8 | **Helm** — `winget install Helm.Helm` | Mudassar | Listed in prerequisites | `helm version` |

**Accounts:**
- **Hassan:** make a **Docker Hub** account → *Account Settings → Personal access tokens* → create a token and **save it** (it's the password for CI/CD).
- **Hassan:** GitHub repo → **Settings → Collaborators → Add people** → add Mudassar.
- **Mudassar:** accept the GitHub invite in your email.

> ⚠️ Docker Desktop must be **running** (whale icon in the taskbar) before any `docker` or `minikube` command works.
> 💻 Mudassar's laptop runs Minikube + Airflow, so it should have **8 GB RAM or more**. If it has less, use Hassan's laptop for Kubernetes.

✅ **Done when:** all the check commands print a version, and `docker run hello-world` prints "Hello from Docker!".

---

## 📁 Part 2 — Project folder + teamwork rules (Both, 10 min) ⏰ 10:00 – 10:10

### Final project structure (who owns each folder)

```
BTC Price Predictor/
├── src/                    🟦 Hassan
│   ├── etl_fetch.py        ← downloads BTC prices
│   ├── config.py           ← paths + settings
│   ├── features.py         ← cleaning + moving averages + volatility
│   ├── forecaster.py       ← model zoo + forecast function (shared with API)
│   └── train_forecast.py   ← trains model, saves model + metrics
├── app/                    🟦 Hassan
│   ├── app.py              ← Flask API (/health, /predict, /metrics, /reload)
│   ├── Dockerfile          ← multi-stage recipe for API image
│   └── requirements.txt
├── frontend/               🟦 Hassan
│   ├── src/                ← React code (chart + metrics)
│   ├── Dockerfile          ← build React, serve with Nginx
│   └── package.json
├── tests/                  🟦 Hassan
│   ├── test_app.py         ← API tests
│   └── test_pipeline.py    ← feature/training tests
├── .github/workflows/      🟦 Hassan
│   └── ci_cd.yml           ← GitHub Actions
├── docker-compose.yml      🟦 Hassan (Mudassar uses it for Airflow)
├── dags/                   🟩 Mudassar
│   └── btc_etl_pipeline.py ← Airflow daily pipeline
├── kubeflow/               🟩 Mudassar
│   ├── btc_kfp_pipeline.py
│   └── btc_kfp_pipeline.yaml (generated)
├── k8s/                    🟩 Mudassar
│   ├── configmap-secret.yaml
│   ├── pvc.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   └── frontend.yaml       ← React deployment + service
├── loadtest/               🟩 Mudassar
│   └── locustfile.py       ← fake traffic for HPA test
├── models/                 🟦 Hassan — registered model (model.pkl, metrics.json …)
├── Docs/                   Both — ROADMAP + step docs + screenshots/ + logs/
└── README.md
```

### 🤝 Teamwork rules (so you don't break each other's work)
1. **Only edit your own folders.** That way Git almost never has conflicts.
2. **Before you start working:** `git pull`
3. **When something works:** 
   ```powershell
   git add .
   git commit -m "short message about what you did"
   git pull
   git push
   ```
4. **Tell your partner on WhatsApp** when you push something they need (see 🔄 SYNC POINTS).

**Mudassar:** clone the repo:
```powershell
git clone https://github.com/MuhammadHassanSaboor/Bitcoin-Predictor-MLOps-University-Project.git
```

Both: make a **conda environment** (a private box of Python + libraries for this project):
```powershell
conda create -n btc_mlops python=3.10 -y
conda activate btc_mlops
pip install -r requirements-dev.txt
```
> React does **not** need conda. It uses Node.js, which is installed separately (step 5 above) and works from any terminal, with or without a conda env active.
> Full details: [01_ENVIRONMENT_SETUP.md](01_ENVIRONMENT_SETUP.md)

> 📸 **Screenshot habit:** Make a folder `Docs/screenshots/`. Every time you see 📸, take a screenshot and name it like `A1_health.png`. This saves hours when writing the report.

---

# 🟦 TRACK H — HASSAN (Data · ML · Flask · React · Docker · CI/CD)

## H1 — Data + ML model ⏰ 10:10 – 11:00

### `src/etl_fetch.py` — download Bitcoin prices
- Uses `yfinance` to download **BTC-USD** daily data (Open, High, Low, Close, Volume) from 2018 until today.
- Saves `data/raw/btc_raw.csv`.

### `src/features.py` — clean + make features
- Remove empty rows, sort by date.
- Add: **7-day moving average**, **30-day moving average**, **volatility**, and "lag" columns (yesterday's price, 2 days ago, …).
- Saves `data/processed/btc_features.csv`.

### `src/train_forecast.py` — train model
- **Model: XGBoost** (fast, easy to install, small file).
- Keep the **last 7 days as test window**, train on everything before.
- Calculate **MAE, RMSE, MAPE** on those 7 days.
- **Threshold rule:** only save ("register") the new model if MAPE < 10%.
- Saves `models/model.pkl`, `models/metrics.json`, `models/model_version.txt`.
- Predicts 7 days by predicting day 1, then using it to predict day 2, and so on ("recursive forecasting").
- Each file has a `main()` function so Mudassar's Airflow DAG and Kubeflow pipeline can call them.

✅ **Check:**
```powershell
python src/etl_fetch.py
python src/features.py
python src/train_forecast.py
```
A `models/` folder with 3 files appears and the metrics are printed. 📸

> 🔄 **SYNC POINT 1 (11:00):** Hassan pushes `src/` → tells Mudassar: *"src is pushed."* Mudassar now uses these files in Airflow + Kubeflow.

---

## H2 — Part A: Flask API + tests ⏰ 11:00 – 12:00 — **10 marks**

### `app/app.py`
| Endpoint | What it does |
|---|---|
| `GET /health` | `{"status":"ok","uptime_seconds":123,"model_version":"2026-11-23"}` |
| `POST /predict` | Body `{"forecast_days": 7}` (optional, default 7). Returns 7 dates + 7 prices. Can also accept a custom list of past prices. |
| `GET /metrics` | MAE, RMSE, MAPE from `metrics.json`. |
| `POST /reload` | Re-reads the model from disk (Mudassar's Airflow calls this). |

Also enable **CORS** (`flask-cors`) so the React page is allowed to call the API.

**Error handling (A2):**
- Wrong input (e.g. `forecast_days: "abc"` or `-5`) → **400 Bad Request** with a clear message.
- Something breaks inside → **500 Internal Server Error**.
- Every endpoint wrapped in `try / except`.

**Gunicorn (A3)** — production start command (works only on Linux/Docker, not Windows — that's normal):
```
gunicorn --bind 0.0.0.0:5000 --workers 2 app:app
```
On Windows, test quickly with `python app/app.py`.

### `tests/test_app.py`
- `/health` returns 200 · `/predict` returns 7 prices · bad input returns 400 · `/metrics` has MAE/RMSE/MAPE.

✅ **Check:**
```powershell
pytest -v                                   # all PASSED 📸
python app/app.py                           # then in another terminal:
curl http://localhost:5000/health           # 📸
curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d "{\"forecast_days\": 7}"   # 📸
curl http://localhost:5000/metrics          # 📸
```

---

## H3 — Part B1 + B2: Docker + docker-compose ⏰ 12:00 – 12:45 — **part of 10 marks**

### `app/Dockerfile` (multi-stage)
- **Stage 1 "builder":** `python:3.10-slim`, install requirements.
- **Stage 2 "runtime":** fresh `python:3.10-slim`, copy only installed packages + code.
- **Non-root user** `appuser` (security).
- Starts with Gunicorn on port 5000.
- `.dockerignore` so `data/`, `.git/`, `Docs/`, `frontend/node_modules/` are not copied.

✅ **Check:**
```powershell
docker build -t <dockerhub-user>/btc-forecast-api:latest -f app/Dockerfile .   # 📸 build output
docker images                                                                  # 📸 image size
docker run -p 5000:5000 <dockerhub-user>/btc-forecast-api:latest
curl http://localhost:5000/health
```

Push it manually once (so Mudassar can start Kubernetes before CI/CD is ready):
```powershell
docker login
docker push <dockerhub-user>/btc-forecast-api:latest
```
On Docker Hub, make the repo **Public** (the link is a deliverable).

### `docker-compose.yml`
Starts together:
1. **api** — Flask container (port 5000)
2. **postgres** — database Airflow needs
3. **airflow-init** — first-time setup (creates `admin / admin` user)
4. **airflow-webserver** — http://localhost:8080
5. **airflow-scheduler** — actually runs the DAG

All share `models/`, `data/`, `src/` and `dags/` folders, so the model Airflow trains is seen by the API.

✅ **Check:**
```powershell
docker compose up -d       # first time ~5–10 min
docker compose ps          # all running 📸
```

> 🔄 **SYNC POINT 2 (12:45):** Hassan pushes `app/`, `tests/`, `docker-compose.yml` and tells Mudassar: *"Image is on Docker Hub: `<dockerhub-user>/btc-forecast-api:latest`, compose file is pushed."*

## 🍽️ Lunch ⏰ 12:45 – 13:15

---

## H4 — Part B3 + B4: GitHub Actions CI/CD ⏰ 13:15 – 14:00 — **part of 10 marks**

`.github/workflows/ci_cd.yml` runs on **every push to `main`** and every **pull request**:

```
Job 1: lint-and-test          Job 2: build-and-push (only if Job 1 passes, only on main)
  ├─ install Python              ├─ log in to Docker Hub with secrets
  ├─ flake8 (code errors)        ├─ build API image (+ React image after H5)
  ├─ black --check (format)      ├─ tag with :latest and :<commit-sha>
  └─ pytest                      └─ push to Docker Hub
```

**Add secrets:** GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
- `DOCKER_USERNAME` = Docker Hub username
- `DOCKER_PASSWORD` = Docker Hub **access token** (from Part 1)

✅ **Check:** push your code → GitHub **Actions** tab → both jobs green ✔️ 📸 → Docker Hub shows tags `latest` + a long SHA. 📸

> ⚠️ Mudassar's pushes also trigger CI. If CI fails because of his Python files (flake8/black), tell him to run `black dags kubeflow loadtest` and push again.

---

## H5 — ⚛️ React dashboard ⏰ 14:00 – 15:30 — *extra marks*

### Create the app
```powershell
cd frontend
npm install
npm run dev        # opens http://localhost:5173 (Flask must run on :5000)
```

### What the page shows (React + Plotly, stock-market style)
1. **Navbar:** live BTC price (real-time feed), 24h change, API status, model version, 🌙/☀️ theme button.
2. **Ticker tape:** scrolling 24h high/low/volume + forecast numbers.
3. **Price chart:** candlesticks + MA 7 + MA 30 + volume + 7-day forecast with 80% range.
4. **Forecast panel:** choose 1–7 days → calls `POST /predict`.
5. **Metric cards:** MAE, RMSE, MAPE, CV MAPE (from `/metrics`) compared with a naive baseline.
6. **Backtest chart + model leaderboard**, **what-if simulator**, **live tick chart**.

Details: [06_REACT_DASHBOARD.md](06_REACT_DASHBOARD.md)

### `frontend/Dockerfile` (multi-stage)
- **Stage 1:** `node:20-alpine` → `npm ci` → `npm run build`
- **Stage 2:** `nginx-unprivileged` → serves the site on port 8080 and forwards `/api/*` to Flask.

Add this image to the CI/CD workflow so it is also pushed as `<dockerhub-user>/btc-forecast-ui`.

✅ **Check:**
```powershell
docker build -t <dockerhub-user>/btc-forecast-ui:latest frontend
docker run -p 3000:80 <dockerhub-user>/btc-forecast-ui:latest
```
Open http://localhost:3000 → chart appears. 📸

> 🔄 **SYNC POINT 3 (15:30):** Hassan pushes `frontend/` and tells Mudassar: *"UI image is on Docker Hub: `<dockerhub-user>/btc-forecast-ui:latest`."*

## H6 — Help Mudassar + README ⏰ 15:30 – 16:30
- Sit with Mudassar for the Kubernetes load test (one runs Locust, one watches the HPA + takes screenshots).
- Write `README.md`: what the project does, architecture picture, how to run it, links to Docker Hub.

---

# 🟩 TRACK M — MUDASSAR (ETL · Kubeflow · Kubernetes)

## M1 — Start Kubernetes + write the YAML files ⏰ 10:10 – 11:00

### Start the cluster
```powershell
minikube start --driver=docker --cpus=4 --memory=6g
minikube addons enable metrics-server     # needed for HPA (autoscaling)
minikube addons enable ingress            # needed for Ingress
kubectl get nodes                         # STATUS = Ready 📸
```

### Write the YAML files in `k8s/` (Part D — **18 marks, the biggest part!**)
Use the image name `<dockerhub-user>/btc-forecast-api:latest` (ask Hassan for his Docker Hub username).

| File | In simple words | Marks item |
|---|---|---|
| `configmap-secret.yaml` | ConfigMap: `MODEL_STAGE=production`, `LOG_LEVEL=INFO`, `PORT=5000`. Secret: `API_KEY`. Both given to the app as environment variables. | D1 |
| `pvc.yaml` | "Give me a 1 GB disk", mounted at `/app/models`, so the model survives pod restarts. | D2 |
| `deployment.yaml` | **3 replicas** of the API image. Liveness probe `GET /health` (initialDelaySeconds 15, periodSeconds 10). Readiness probe `GET /health`. CPU request 100m / limit 500m, memory 128Mi / 512Mi. | D3 |
| `service.yaml` | ClusterIP (inside) + NodePort (outside), **port 80 → targetPort 5000**. | D4 |
| `hpa.yaml` | min 2, max 8 pods, scale up when CPU > 60%. | D5 |
| `ingress.yaml` | Host `btc-forecast.local`: `/health`, `/predict`, `/metrics` → API service; `/` → React UI service. | D6 |
| `frontend.yaml` | Deployment (2 replicas) + Service for the React UI image. | Bonus |

> ⚠️ Several pods share one PVC. If the PVC is empty, the pod copies a starter model into it when it starts (an "init container"). So the API works even before Airflow has run.

You can't apply these yet, because the image isn't ready (it arrives at SYNC POINT 2, ~12:45).

---

## M2 — Part C2: Kubeflow pipeline ⏰ 11:00 – 11:45 — **part of 12 marks**

> Wait for 🔄 SYNC POINT 1, then `git pull` to get Hassan's `src/`.

> 💡 Installing full Kubeflow on a laptop is very heavy (needs 16 GB+ RAM). The assignment only asks to **write the pipeline with the KFP SDK and compile it to YAML**, so that's what we do.

`kubeflow/btc_kfp_pipeline.py`:
- 3 components: `ingest_data` → `generate_features` → `train_model`.
- Each component is a **container component** that runs inside our Docker image.
- Data is passed between them as artifacts (Kubeflow tracks these).
- Running the file compiles it into `kubeflow/btc_kfp_pipeline.yaml`.

✅ **Check:**
```powershell
pip install kfp
python kubeflow/btc_kfp_pipeline.py
```
`btc_kfp_pipeline.yaml` appears → open in VS Code. 📸

---

## M3 — Part C1: Airflow ETL DAG (write it) ⏰ 11:45 – 12:45 — **part of 12 marks**

`dags/btc_etl_pipeline.py` runs **every day** (`schedule="@daily"`) with 4 tasks in a chain:

```
fetch_data  →  preprocess_features  →  train_and_evaluate  →  reload_api_model
```

| Task | What it does | Uses |
|---|---|---|
| `fetch_data` | Downloads BTC-USD data, saves raw CSV in the shared folder. | `src/etl_fetch.py` |
| `preprocess_features` | Cleans data, adds moving averages + volatility. | `src/features.py` |
| `train_and_evaluate` | Trains, computes MAE/RMSE/MAPE on last 7 days, saves model **only if it passes the threshold**. | `src/train_forecast.py` |
| `reload_api_model` | Sends `POST http://api:5000/reload` so the API loads the new model. | Hassan's `/reload` |

## 🍽️ Lunch ⏰ 12:45 – 13:15

## M4 — Run Airflow + trigger the DAG ⏰ 13:15 – 14:00

> Wait for 🔄 SYNC POINT 2, then `git pull` to get `docker-compose.yml`.

```powershell
docker compose up -d
docker compose ps          # all running 📸
```
1. Open http://localhost:8080 → login `admin / admin`. 📸
2. Turn the DAG **ON** (toggle), then click ▶ **Trigger DAG**.
3. **Graph** view → all 4 boxes turn **dark green**. 📸 (Required in the report!)
4. `curl http://localhost:5000/health` → `model_version` has changed. 📸

Then stop it to free RAM for Kubernetes: `docker compose down`

---

## M5 — Part D: Deploy to Kubernetes ⏰ 14:00 – 15:30 — **18 marks**

### Apply everything
```powershell
kubectl apply -f k8s/
kubectl get pods            # 3 API pods "Running" and "1/1" 📸
kubectl get svc             # 📸
kubectl get pvc             # STATUS = Bound 📸
kubectl get configmap,secret   # 📸
kubectl get hpa             # 📸
kubectl get ingress         # 📸
```

### Call the live API on Kubernetes
```powershell
minikube service btc-forecast-nodeport --url    # gives a URL like http://127.0.0.1:54321
curl -X POST <that-url>/predict -H "Content-Type: application/json" -d "{\"forecast_days\":7}"   # 📸
```

### Ingress with a nice name (D6)
1. Open **Notepad as Administrator** → open `C:\Windows\System32\drivers\etc\hosts`
2. Add: `127.0.0.1 btc-forecast.local`
3. In a **separate terminal**, run and keep it open: `minikube tunnel`
4. Open http://btc-forecast.local/health in the browser. 📸
5. After 🔄 SYNC POINT 3: open http://btc-forecast.local → the **React dashboard** shows the forecast. 📸

---

## M6 — Load test + autoscaling (D5) ⏰ 15:30 – 16:15 (with Hassan)

`loadtest/locustfile.py` = fake users calling `/predict` and `/health` again and again.

```powershell
pip install locust
# Terminal 1:
kubectl get hpa --watch
# Terminal 2:
locust -f loadtest/locustfile.py --host <nodeport-url>
```
Open http://localhost:8089 → 200 users, spawn rate 20 → **Start**.
Watch Terminal 1: replicas go **2 → 3 → 5 → …** 📸📸 (3–4 screenshots over time + Locust **Charts** tab = "autoscaling graph").
Stop Locust → after ~5 min the pods go back down. 📸

---

## M7 — Part E1: Chaos test / self-healing ⏰ 16:15 – 16:30 — **part of 10 marks**

```powershell
kubectl get pods                         # copy one pod name 📸
kubectl delete pod <pod-name>            # kill it 📸
kubectl get pods -w                      # a NEW pod appears automatically 📸
```
**For the report:** *"The Deployment wants N replicas. When we deleted one, the ReplicaSet controller saw only N-1 and immediately created a replacement. Within ~X seconds the new pod passed its readiness probe and received traffic again — no downtime."*

---

# 👥 BOTH TOGETHER

## Step 11 — Part E2: End-to-end check ⏰ 16:30 – 17:00

Tick all of these and screenshot each:
- [ ] Airflow DAG triggered manually → all tasks green *(Mudassar)*
- [ ] `/health` shows the new `model_version` *(Mudassar)*
- [ ] GitHub Actions latest run is green *(Hassan)*
- [ ] Docker Hub has `latest` + SHA tags for API and UI *(Hassan)*
- [ ] `curl` to the Kubernetes endpoint returns 7 dates + 7 prices *(Mudassar)*
- [ ] React dashboard opens at http://btc-forecast.local *(Both)*

---

## Step 12 — Part E3: PDF Report (4–6 pages) ⏰ 17:00 – 18:30

Write in **one shared Google Doc** at the same time → export as PDF → save in `Docs/`. **Each person writes the parts they built.**

| Section | What to include | Writer |
|---|---|---|
| 1. Title page | Assignment title, both names + roll numbers, repo link, Docker Hub links | Hassan |
| 2. Architecture diagram | yfinance → Airflow → model on PVC → Flask pods → Service/Ingress → React/user; GitHub Actions → Docker Hub → K8s (draw on https://draw.io) | Hassan |
| 3. Part A — Flask API | `/health`, `/predict`, `/metrics` outputs + pytest output | Hassan |
| 4. Part B — Docker & CI/CD | Docker build output, image size, compose `ps`, Actions green run, Docker Hub tags | Hassan |
| 5. React dashboard | 1–2 screenshots | Hassan |
| 6. Part C — Airflow & Kubeflow | Airflow graph (all green), KFP YAML snippet | Mudassar |
| 7. Part D — Kubernetes | `kubectl get pods/svc/pvc/hpa/ingress`, Ingress in browser, HPA watch + Locust charts | Mudassar |
| 8. Part E — Resilience | Pod delete + new pod, end-to-end checklist | Mudassar |
| 9. Performance analysis | MAE/RMSE/MAPE table (Hassan) + Locust requests/sec, response times, pods created by HPA (Mudassar) | Both |
| 10. Conclusion | 3–4 lines: what we learned, what could be better | Both |

---

## Step 13 — Final submit (Hassan) ⏰ 18:30 – 19:00

- [ ] Mudassar pushes his last changes
- [ ] Hassan: `git pull` → final `README.md` → `git push` → Actions green
- [ ] Submit: **GitHub repo link** + **Docker Hub links** + **PDF report**

---

## ⏱️ Whole day at a glance

| Time | 🟦 Hassan | 🟩 Mudassar |
|---|---|---|
| 9:00 – 10:00 | Install tools, Docker Hub account, add Mudassar to repo | Install tools, accept GitHub invite |
| 10:10 – 11:00 | **H1** Data + ML model | **M1** Start Minikube, write K8s YAML |
| 11:00 – 12:00 | **H2** Flask API + pytest | 🔄1 → **M2** Kubeflow pipeline (till 11:45) |
| 12:00 – 12:45 | **H3** Dockerfile, compose, push image | **M3** Write Airflow DAG |
| 12:45 – 13:15 | 🍽️ Lunch | 🍽️ Lunch |
| 13:15 – 14:00 | **H4** GitHub Actions CI/CD | 🔄2 → **M4** Run Airflow, trigger DAG |
| 14:00 – 15:30 | **H5** React dashboard | **M5** Deploy on Kubernetes + Ingress |
| 15:30 – 16:30 | 🔄3 → **H6** Help with load test, README | **M6** Load test + HPA, **M7** chaos test |
| 16:30 – 17:00 | **E2** end-to-end check (together) | **E2** end-to-end check (together) |
| 17:00 – 18:30 | Report: sections 1–5, 9, 10 | Report: sections 6–10 |
| 18:30 – 19:00 | Final push + submit | Final push |

---

## 🆘 Common problems & quick fixes

| Problem | Fix | Who usually hits it |
|---|---|---|
| `docker: command not found` / cannot connect | Open **Docker Desktop** and wait for "Running". | Both |
| `git push` rejected | `git pull` first, then push again. | Both |
| `npm` not found | Install Node.js LTS, then **restart VS Code**. | Hassan |
| React page shows "API down" / CORS error | Check `flask-cors` is enabled and `VITE_API_URL` is correct. | Hassan |
| `gunicorn` error on Windows | Normal: Gunicorn only works on Linux. Use it inside Docker. | Hassan |
| Actions fails at flake8/black | Run `black .` locally, then push again. | Hassan |
| Actions fails at Docker login | Secret names must be exactly `DOCKER_USERNAME` and `DOCKER_PASSWORD`. | Hassan |
| Airflow page not opening | Wait 2–3 more minutes; check `docker compose logs airflow-webserver`. | Mudassar |
| DAG not showing in Airflow | Check the file is in `dags/`; look at the "Import Errors" banner at the top. | Mudassar |
| `minikube start` fails | `minikube delete`, then start again. Docker Desktop must be running. | Mudassar |
| Pod stuck in `ImagePullBackOff` | Image name wrong or Docker Hub repo private. Fix the name in `deployment.yaml`, make the repo public. | Mudassar |
| Pod in `CrashLoopBackOff` | `kubectl logs <pod-name>` to read the error. | Mudassar |
| HPA shows `<unknown>/60%` | `minikube addons enable metrics-server`, wait 1–2 minutes. | Mudassar |
| HPA not scaling up | Increase Locust users (e.g. 500). | Mudassar |
| `btc-forecast.local` not opening | Check the hosts file line, and that `minikube tunnel` is still running. | Mudassar |
| Laptop very slow | Don't run Airflow (compose) and Minikube at the same time; `docker compose down` first. | Mudassar |

---

## 🏁 Marks checklist (tick before submitting)

| Part | Item | Marks | Owner | Done |
|---|---|---|---|---|
| A | `/health`, `/predict`, `/metrics` + validation + Gunicorn + pytest | 10 | Hassan | ☐ |
| B | Multi-stage Dockerfile, docker-compose, CI lint+test, CD push to Docker Hub | 10 | Hassan | ☐ |
| C | Airflow DAG (4 tasks) + Kubeflow pipeline compiled to YAML | 12 | Mudassar | ☐ |
| D | ConfigMap/Secret, PVC, Deployment (3 replicas, probes, limits), Service, HPA + load test, Ingress | 18 | Mudassar | ☐ |
| E | Self-healing test, end-to-end check, 4–6 page PDF report | 10 | Both | ☐ |
| ⭐ | React dashboard served via Kubernetes Ingress | bonus | Hassan | ☐ |
| | **Total** | **60** | | |
