# syntax=docker/dockerfile:1
# Multi-stage build for the BTC forecast Flask API.
# Build from the repository root:
#   docker build -t btc-forecast-api:latest -f app/Dockerfile .

# ---------- Stage 1: builder (installs Python packages into a virtualenv) ----------
FROM python:3.10-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only the requirements first so this layer is cached until they change.
COPY app/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt


# ---------- Stage 2: runtime (small image, no build tools, non-root user) ----------
FROM python:3.10-slim AS runtime

LABEL org.opencontainers.image.title="btc-forecast-api" \
      org.opencontainers.image.description="Flask + Gunicorn API serving a 7-day Bitcoin price forecast"

# libgomp1 is the OpenMP runtime needed by LightGBM / XGBoost.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --no-create-home --shell /usr/sbin/nologin appuser

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    GUNICORN_WORKERS=2 \
    MODEL_DIR=/app/models \
    SEED_MODEL_DIR=/app/seed_models \
    DATA_DIR=/app/data

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser app/app.py ./app.py
# Model shipped inside the image; copied into MODEL_DIR on first start if that
# folder (e.g. an empty Kubernetes volume) has no model yet.
COPY --chown=appuser:appuser models/model.pkl models/metrics.json models/model_version.txt ./seed_models/

RUN mkdir -p /app/models /app/data && chown -R appuser:appuser /app/models /app/data

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"5000\")}/health', timeout=4)" || exit 1

CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT} --workers ${GUNICORN_WORKERS} --threads 2 --timeout 60 --access-logfile - app:app"]
