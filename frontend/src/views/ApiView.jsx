import { useState } from "react";
import { API_BASE, fmtDuration, rawRequest } from "../api";
import { IconPlay, IconServer } from "../components/Icons";

const ENDPOINTS = [
  { id: "health", method: "GET", path: "/health", desc: "Status, uptime and loaded model version" },
  { id: "predict", method: "POST", path: "/predict", desc: "7-day forecast (optional days / custom history)", body: '{\n  "forecast_days": 7\n}' },
  { id: "predict-bad", method: "POST", path: "/predict", desc: "Validation example → 400 Bad Request", body: '{\n  "forecast_days": 30\n}' },
  { id: "metrics", method: "GET", path: "/metrics", desc: "MAE, RMSE, MAPE of the latest validation run" },
  { id: "history", method: "GET", path: "/history?days=5", desc: "Recent daily OHLCV data" },
];

// Minimal JSON syntax highlighting (escapes HTML first).
function highlight(json) {
  const esc = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "j-num";
      if (m.startsWith('"')) cls = m.endsWith(":") ? "j-key" : "j-str";
      else if (/true|false|null/.test(m)) cls = "j-bool";
      return `<span class="${cls}">${m}</span>`;
    },
  );
}

export default function ApiView({ health, latencyMs }) {
  const [sel, setSel] = useState(ENDPOINTS[0]);
  const [body, setBody] = useState(ENDPOINTS[0].body || "");
  const [resp, setResp] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = (ep) => {
    setSel(ep);
    setBody(ep.body || "");
    setResp(null);
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await rawRequest(sel.method, sel.path, sel.method === "POST" ? body : undefined);
      setResp(r);
    } catch (e) {
      setResp({ ok: false, status: 0, statusText: "Network error", ms: null, text: String(e.message) });
    } finally {
      setBusy(false);
    }
  };

  const pretty = resp ? (resp.json ? JSON.stringify(resp.json, null, 2) : resp.text) : "";
  const curl =
    sel.method === "POST"
      ? `curl -X POST ${location.origin}${API_BASE}${sel.path} \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\s+/g, " ").trim()}'`
      : `curl ${location.origin}${API_BASE}${sel.path}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>API console</h1>
          <p>Call the live Flask REST API served by Gunicorn · base URL {API_BASE}</p>
        </div>
      </div>

      <section className="kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi">
          <span className="label-sm">Status</span>
          <span className={`value ${health?.status === "ok" ? "up" : "down"}`}>{health?.status === "ok" ? "Healthy" : "Unavailable"}</span>
          <span className="foot">GET /health</span>
        </div>
        <div className="kpi">
          <span className="label-sm">Latency</span>
          <span className="value num">{latencyMs != null ? `${latencyMs} ms` : "—"}</span>
          <span className="foot">last dashboard request</span>
        </div>
        <div className="kpi">
          <span className="label-sm">Uptime</span>
          <span className="value num">{fmtDuration(health?.uptime_seconds)}</span>
          <span className="foot">since the worker started</span>
        </div>
        <div className="kpi">
          <span className="label-sm">Serving pod</span>
          <span className="value num" style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis" }}>
            {health?.pod || "—"}
          </span>
          <span className="foot">stage {health?.model_stage || "—"}</span>
        </div>
      </section>

      <div className="grid-model">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <h2>Endpoints</h2>
              <p>Select one and press Send</p>
            </div>
            <IconServer className="muted" />
          </div>
          <div className="endpoints">
            {ENDPOINTS.map((ep) => (
              <button key={ep.id} className={`endpoint ${sel.id === ep.id ? "active" : ""}`} onClick={() => choose(ep)}>
                <span className={`method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span>
                  <div className="path">{ep.path}</div>
                  <div className="desc">{ep.desc}</div>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <h2 className="num">
                <span className={`method ${sel.method.toLowerCase()}`} style={{ padding: "2px 6px", marginRight: 8 }}>
                  {sel.method}
                </span>
                {sel.path}
              </h2>
            </div>
            <button className="btn btn-primary" onClick={send} disabled={busy}>
              {busy ? <span className="spinner" /> : <IconPlay />} Send
            </button>
          </div>

          <div className="panel-body" style={{ borderBottom: "1px solid var(--border)" }}>
            {sel.method === "POST" && (
              <>
                <div className="label-sm" style={{ marginBottom: 6 }}>
                  Request body
                </div>
                <textarea className="code" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} aria-label="Request body" />
              </>
            )}
            <div className="label-sm" style={{ margin: sel.method === "POST" ? "12px 0 6px" : "0 0 6px" }}>
              cURL
            </div>
            <pre className="code" style={{ borderRadius: 8, border: "1px solid var(--border)", maxHeight: 120 }}>
              {curl}
            </pre>
          </div>

          {resp ? (
            <>
              <div className="resp-meta">
                <span className={`badge ${resp.ok ? "up" : "down"} num`}>
                  {resp.status} {resp.statusText}
                </span>
                {resp.ms != null && <span className="muted num">{resp.ms} ms</span>}
                <span className="muted">application/json</span>
              </div>
              <pre className="code" dangerouslySetInnerHTML={{ __html: highlight(pretty) }} />
            </>
          ) : (
            <div className="panel-body muted" style={{ padding: 28, textAlign: "center" }}>
              Press <b>Send</b> to call the endpoint. The response appears here.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
