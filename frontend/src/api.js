// Client for the Flask API.
// Development: Vite proxies /api -> http://localhost:5000.
// Docker / Kubernetes: Nginx in the UI container proxies /api -> the API service.
export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// Round-trip time of the last successful request (shown in the status bar).
export const latency = { last: null };

// Low-level call: never throws for HTTP errors, returns status + body + timing.
export async function rawRequest(method, path, body) {
  const started = performance.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? body : undefined,
  });
  const ms = Math.round(performance.now() - started);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { ok: res.ok, status: res.status, statusText: res.statusText, ms, json, text };
}

async function request(method, path, payload) {
  const r = await rawRequest(method, path, payload ? JSON.stringify(payload) : undefined);
  if (!r.ok) throw new Error(r.json?.message || `Request failed with status ${r.status}`);
  latency.last = r.ms;
  return r.json;
}

export const api = {
  health: () => request("GET", "/health"),
  metrics: () => request("GET", "/metrics"),
  history: (days = 400) => request("GET", `/history?days=${days}`),
  predict: (payload = {}) => request("POST", "/predict", payload),
};

// ----------------------------------------------------------------- formatting
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export const fmtUsd = (v, digits = 2) =>
  isNum(v)
    ? v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";

export const fmtNum = (v, digits = 2) =>
  isNum(v)
    ? v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

export const fmtPct = (v, digits = 2, sign = true) =>
  isNum(v) ? `${sign && v > 0 ? "+" : ""}${v.toFixed(digits)}%` : "—";

export const fmtCompact = (v) =>
  isNum(v) ? v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 }) : "—";

export const fmtDate = (iso, opts = { month: "short", day: "numeric" }) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts }) : "—";

export const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }) + " UTC"
    : "—";

export const fmtDuration = (s) => {
  if (!isNum(s)) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(s % 60)}s`;
};

// Market signal from the 7-day forecast change.
export function signalFrom(changePct) {
  if (!isNum(changePct)) return { label: "—", tone: "", score: 50 };
  const score = Math.max(0, Math.min(100, 50 + changePct * 10)); // ±5% maps to the ends
  if (changePct > 1) return { label: "Bullish", tone: "up", score };
  if (changePct < -1) return { label: "Bearish", tone: "down", score };
  return { label: "Neutral", tone: "", score };
}
