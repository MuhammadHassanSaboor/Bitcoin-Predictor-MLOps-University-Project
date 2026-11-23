// Small client for the Flask API.
// In development Vite proxies /api -> http://localhost:5000.
// In Docker / Kubernetes, Nginx proxies /api -> the API service.
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const message = body?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  health: () => request("/health"),
  metrics: () => request("/metrics"),
  history: (days = 400) => request(`/history?days=${days}`),
  predict: (payload = {}) =>
    request("/predict", { method: "POST", body: JSON.stringify(payload) }),
};

export const fmtUsd = (v, digits = 2) =>
  v == null || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtPct = (v, digits = 2) =>
  v == null || Number.isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtCompact = (v) =>
  v == null || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });

export const fmtDate = (iso, opts = { month: "short", day: "numeric" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
