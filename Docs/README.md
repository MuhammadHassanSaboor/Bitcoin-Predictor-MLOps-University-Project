# Project Documentation

Read in this order:

| # | Document | What it covers | Owner |
|---|---|---|---|
| 0 | [ROADMAP.md](ROADMAP.md) | One-day plan, who does what, sync points, marks checklist | Both |
| 1 | [01_ENVIRONMENT_SETUP.md](01_ENVIRONMENT_SETUP.md) | Conda env, Node.js, Docker, `.env` | Both |
| 2 | [02_DATA_AND_MODEL.md](02_DATA_AND_MODEL.md) | ETL, features, model search, evaluation, registration, results | Hassan |
| 3 | [03_FLASK_API.md](03_FLASK_API.md) | REST endpoints, validation, errors, Gunicorn, tests (Part A) | Hassan |
| 4 | [04_DOCKER_AND_COMPOSE.md](04_DOCKER_AND_COMPOSE.md) | Multi-stage Dockerfiles, docker-compose with Airflow + Postgres (Part B1–B2) | Hassan |
| 5 | [05_CI_CD_GITHUB_ACTIONS.md](05_CI_CD_GITHUB_ACTIONS.md) | Lint, tests, image build & push (Part B3–B4) | Hassan |
| 6 | [06_REACT_DASHBOARD.md](06_REACT_DASHBOARD.md) | React + Plotly dashboard, dark/light theme | Hassan |
| 7 | [07_GIT_WORKFLOW.md](07_GIT_WORKFLOW.md) | Branches, pull requests, team rules | Both |
| 8 | [08_HANDOVER_TO_MUDASSAR.md](08_HANDOVER_TO_MUDASSAR.md) | Interfaces for Airflow, Kubeflow and Kubernetes | Hassan → Mudassar |

Evidence for the report:

- [screenshots/](screenshots/README.md): screenshots grouped by assignment part
- [logs/](logs/): full text output of every command used in the screenshots
