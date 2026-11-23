"""Unit tests for the Flask REST API (Part A)."""

import pytest


# ----------------------------------------------------------------------------- /health
def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["model_version"] == "v-test"
    assert body["uptime_seconds"] >= 0


def test_health_without_model_still_answers(empty_client):
    res = empty_client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["model_loaded"] is False


# ----------------------------------------------------------------------------- /predict
def test_predict_default_is_7_days(client):
    res = client.post("/predict", json={})
    assert res.status_code == 200
    body = res.get_json()
    preds = body["predictions"]
    assert len(preds) == 7
    assert [p["day"] for p in preds] == list(range(1, 8))
    for p in preds:
        assert p["predicted_close"] > 0
        assert p["lower_80"] <= p["predicted_close"] <= p["upper_80"]
        assert len(p["date"]) == 10


def test_predict_without_body(client):
    res = client.post("/predict")
    assert res.status_code == 200
    assert len(res.get_json()["predictions"]) == 7


def test_predict_dates_follow_last_date(client):
    body = client.post("/predict", json={"forecast_days": 2}).get_json()
    assert body["forecast_days"] == 2
    assert len(body["predictions"]) == 2
    assert body["predictions"][0]["date"] > body["last_date"]


@pytest.mark.parametrize("days", [1, 3, 7])
def test_predict_custom_days(client, days):
    res = client.post("/predict", json={"forecast_days": days})
    assert res.status_code == 200
    assert len(res.get_json()["predictions"]) == days


def test_predict_with_custom_history(client):
    history = [50000 + i * 25 for i in range(90)]
    res = client.post(
        "/predict", json={"forecast_days": 7, "history": history, "last_date": "2025-03-31"}
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["based_on"] == "custom_history"
    assert body["last_close"] == history[-1]
    assert body["predictions"][0]["date"] == "2025-04-01"


@pytest.mark.parametrize(
    "payload, message",
    [
        ({"forecast_days": "abc"}, "integer"),
        ({"forecast_days": 0}, "between"),
        ({"forecast_days": 30}, "between"),
        ({"forecast_days": True}, "integer"),
        ({"forecast_days": None}, "integer"),
        ({"history": "not-a-list"}, "list"),
        ({"history": [1, 2, 3]}, "between"),
        ({"history": [100.0] * 59 + [-5]}, "positive"),
        ({"history": [100.0] * 59 + ["x"]}, "positive"),
        ({"last_date": "2025-01-01"}, "together"),
        ({"history": [100.0] * 60, "last_date": "31/12/2025"}, "YYYY-MM-DD"),
    ],
)
def test_predict_rejects_bad_input(client, payload, message):
    res = client.post("/predict", json=payload)
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"] == "Bad Request"
    assert message in body["message"]


def test_predict_rejects_non_object_json(client):
    res = client.post("/predict", json=[1, 2, 3])
    assert res.status_code == 400


def test_predict_rejects_invalid_json(client):
    res = client.post("/predict", data="{not json", content_type="application/json")
    assert res.status_code == 400


def test_predict_without_model_returns_503(empty_client):
    res = empty_client.post("/predict", json={})
    assert res.status_code == 503


def test_predict_internal_error_returns_500(client, monkeypatch):
    import app as app_module

    def boom(*args, **kwargs):
        raise RuntimeError("model exploded")

    monkeypatch.setattr(app_module, "forecast", boom)
    res = client.post("/predict", json={})
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal Server Error"


# ----------------------------------------------------------------------------- /metrics
def test_metrics(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    body = res.get_json()
    for key in ("mae", "rmse", "mape"):
        assert key in body


# ----------------------------------------------------------------------------- /history
def test_history(client):
    res = client.get("/history?days=30")
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["close"]) == 30
    assert set(body) == {"dates", "open", "high", "low", "close", "volume"}


@pytest.mark.parametrize("days", ["0", "abc", "1000"])
def test_history_bad_days(client, days):
    assert client.get(f"/history?days={days}").status_code == 400


# ----------------------------------------------------------------------------- /reload
def test_reload(client):
    res = client.post("/reload")
    assert res.status_code == 200
    assert res.get_json()["status"] == "reloaded"


def test_reload_requires_api_key_when_set(client, monkeypatch):
    monkeypatch.setenv("API_KEY", "secret-key")
    assert client.post("/reload").status_code == 401
    ok = client.post("/reload", headers={"X-API-Key": "secret-key"})
    assert ok.status_code == 200


# ----------------------------------------------------------------------------- errors
def test_unknown_route_is_json_404(client):
    res = client.get("/does-not-exist")
    assert res.status_code == 404
    assert res.get_json()["error"] == "Not Found"


def test_wrong_method_is_json_405(client):
    res = client.get("/predict")
    assert res.status_code == 405
