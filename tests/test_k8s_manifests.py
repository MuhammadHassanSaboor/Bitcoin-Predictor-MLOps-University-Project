"""Checks that the Kubernetes manifests keep the settings Part D asks for."""

from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

K8S = Path(__file__).resolve().parent.parent / "k8s"


def load(name: str) -> dict:
    docs = [d for d in yaml.safe_load_all((K8S / name).read_text()) if d]
    return {(d["kind"], d["metadata"]["name"]): d for d in docs}


def api_container() -> dict:
    dep = load("deployment.yaml")[("Deployment", "btc-forecast-api")]
    return dep["spec"]["template"]["spec"]["containers"][0]


def test_configmap_and_secret():
    docs = load("configmap-secret.yaml")
    cm = docs[("ConfigMap", "btc-api-config")]["data"]
    assert {"MODEL_STAGE", "LOG_LEVEL", "PORT"} <= cm.keys()
    assert cm["PORT"] == "5000"
    assert "API_KEY" in docs[("Secret", "btc-api-secret")]["stringData"]

    env_from = api_container()["envFrom"]
    assert {"configMapRef": {"name": "btc-api-config"}} in env_from
    assert {"secretRef": {"name": "btc-api-secret"}} in env_from


def test_pvc_mounted_at_models():
    assert ("PersistentVolumeClaim", "btc-models-pvc") in load("pvc.yaml")
    dep = load("deployment.yaml")[("Deployment", "btc-forecast-api")]
    volumes = dep["spec"]["template"]["spec"]["volumes"]
    mounts = api_container()["volumeMounts"]
    assert volumes[0]["persistentVolumeClaim"]["claimName"] == "btc-models-pvc"
    assert mounts[0] == {"name": volumes[0]["name"], "mountPath": "/app/models"}


def test_deployment_replicas_probes_resources():
    dep = load("deployment.yaml")[("Deployment", "btc-forecast-api")]
    assert dep["spec"]["replicas"] >= 3

    c = api_container()
    live, ready = c["livenessProbe"], c["readinessProbe"]
    assert live["httpGet"]["path"] == ready["httpGet"]["path"] == "/health"
    assert live["initialDelaySeconds"] == 15 and live["periodSeconds"] == 10
    assert c["resources"] == {
        "requests": {"cpu": "100m", "memory": "128Mi"},
        "limits": {"cpu": "500m", "memory": "512Mi"},
    }


def test_services_port_80_to_5000():
    docs = load("service.yaml")
    types = {d["spec"]["type"] for d in docs.values()}
    assert types == {"ClusterIP", "NodePort"}
    for svc in docs.values():
        assert svc["spec"]["ports"][0]["port"] == 80
        assert svc["spec"]["ports"][0]["targetPort"] == 5000


def test_hpa():
    spec = load("hpa.yaml")[("HorizontalPodAutoscaler", "btc-forecast-api")]["spec"]
    assert spec["scaleTargetRef"]["name"] == "btc-forecast-api"
    assert (spec["minReplicas"], spec["maxReplicas"]) == (2, 8)
    cpu = spec["metrics"][0]["resource"]
    assert cpu["name"] == "cpu" and cpu["target"]["averageUtilization"] == 60


def test_ingress_host():
    ing = load("ingress.yaml")[("Ingress", "btc-forecast")]["spec"]
    assert ing["ingressClassName"] == "nginx"
    rule = ing["rules"][0]
    assert rule["host"] == "btc-forecast.local"
    backends = {p["path"]: p["backend"]["service"]["name"] for p in rule["http"]["paths"]}
    assert backends["/predict"] == "btc-forecast-api"
