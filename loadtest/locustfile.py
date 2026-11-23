"""Locust load test used to trigger the HPA (Part D5).

Web UI (charts for the report):
    locust -f loadtest/locustfile.py --host http://127.0.0.1:<nodeport>
    -> http://localhost:8089, e.g. 200 users, spawn rate 20

Headless (CSV + HTML report into Docs/logs):
    locust -f loadtest/locustfile.py --host <url> --headless -u 200 -r 20 -t 5m \
        --csv Docs/logs/D5_locust --html Docs/logs/D5_locust_report.html

Watch the autoscaler in another terminal:  kubectl get hpa --watch
"""

import random

from locust import HttpUser, between, task


class ForecastUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task(6)
    def predict(self):
        payload = {"forecast_days": random.randint(1, 7)}
        with self.client.post("/predict", json=payload, catch_response=True) as resp:
            if resp.status_code != 200:
                resp.failure(f"status {resp.status_code}")
            elif len(resp.json().get("predictions", [])) != payload["forecast_days"]:
                resp.failure("wrong number of predictions")

    @task(2)
    def health(self):
        self.client.get("/health")

    @task(1)
    def metrics(self):
        self.client.get("/metrics")
