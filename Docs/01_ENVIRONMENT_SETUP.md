# 01 · Environment Setup

How to prepare a Windows laptop to run this project. Do it once.

## 1. Tools

| Tool | Why we need it | Check |
|---|---|---|
| Git | Download and upload code | `git --version` |
| Miniconda | Python 3.10 + an isolated environment for the project | `conda --version` |
| Node.js 20+ (LTS) | Build and run the React dashboard | `node -v`, `npm -v` |
| Docker Desktop (WSL 2) | Build and run containers | `docker run hello-world` |
| VS Code | Editor | – |

> **Conda and React:** React does not live inside conda. Node.js is a separate program,
> so `npm` works in any terminal, whether or not a conda environment is active.

## 2. Get the code

```powershell
git clone https://github.com/MuhammadHassanSaboor/Bitcoin-Predictor-MLOps-University-Project.git
cd Bitcoin-Predictor-MLOps-University-Project
```

## 3. Python environment (conda)

```powershell
conda create -n btc_mlops python=3.10 -y
conda activate btc_mlops
pip install -r requirements-dev.txt
```

`requirements-dev.txt` = everything in `app/requirements.txt` (runtime) + `pytest`, `flake8`, `black`.
All versions are pinned so the model file loads the same way everywhere (laptop, Docker, Airflow, CI).

Check:
```powershell
python -c "import flask, xgboost, lightgbm, sklearn; print('ok')"
```

## 4. React dashboard packages

```powershell
cd frontend
npm install
cd ..
```

## 5. Local settings file

```powershell
copy .env.example .env
```
Edit `.env` and set at least `DOCKER_USERNAME` and `API_KEY`.
`.env` is in `.gitignore`, so it is **never** uploaded to GitHub.

## 6. Quick smoke test

```powershell
pytest                       # 41 tests should pass
python app/app.py            # API on http://localhost:5000
# new terminal:
cd frontend; npm run dev     # dashboard on http://localhost:5173
```

## Common problems

| Problem | Fix |
|---|---|
| `conda` not recognised in PowerShell | Run `conda init powershell` once, then reopen the terminal (or use "Anaconda Prompt"). |
| `npm` not recognised | Install Node.js LTS and reopen VS Code. |
| `docker` cannot connect | Start Docker Desktop and wait until it says *Running*. |
| `gunicorn` fails on Windows | Normal: Gunicorn only runs on Linux. Use `python app/app.py` locally; Gunicorn runs inside Docker. |
