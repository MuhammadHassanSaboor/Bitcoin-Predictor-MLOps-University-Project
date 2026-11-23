import { fmtDate, fmtPct, fmtUsd } from "../api";

export default function ForecastPanel({ forecast, days, setDays, onRun, running, error }) {
  const preds = forecast?.predictions || [];
  const last = preds.at(-1);
  const up = (last?.change_pct ?? 0) >= 0;
  const maxAbs = Math.max(0.5, ...preds.map((p) => Math.abs(p.change_pct)));

  return (
    <section className="card forecast-card">
      <div className="card-head">
        <div>
          <h2>Forecast</h2>
          <p className="muted">POST /predict · next {days} day{days > 1 ? "s" : ""}</p>
        </div>
        <span className="badge">{forecast?.model_name || "model"}</span>
      </div>

      <label className="field-label" htmlFor="days">
        Forecast horizon
      </label>
      <div className="seg full" id="days" role="radiogroup" aria-label="Forecast days">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            role="radio"
            aria-checked={days === d}
            className={days === d ? "active" : ""}
            onClick={() => setDays(d)}
          >
            {d}D
          </button>
        ))}
      </div>

      <button className="primary-btn" onClick={onRun} disabled={running}>
        {running ? <span className="spinner" /> : "⚡"} {running ? "Forecasting…" : "Run forecast"}
      </button>

      {error && <div className="error-box">{error}</div>}

      {last && (
        <div className={`headline ${up ? "up" : "down"}`}>
          <span className="muted small">Target on {fmtDate(last.date, { weekday: "short", month: "short", day: "numeric" })}</span>
          <span className="headline-price mono">{fmtUsd(last.predicted_close)}</span>
          <span className={`chip ${up ? "up" : "down"}`}>
            {up ? "▲" : "▼"} {fmtPct(last.change_pct)} vs {fmtUsd(forecast.last_close, 0)}
          </span>
          <span className="muted small">
            80% range {fmtUsd(last.lower_80, 0)} – {fmtUsd(last.upper_80, 0)}
          </span>
        </div>
      )}

      <table className="ftable">
        <thead>
          <tr>
            <th>Date</th>
            <th className="num">Price</th>
            <th className="num">Change</th>
          </tr>
        </thead>
        <tbody>
          {preds.map((p) => {
            const pos = p.change_pct >= 0;
            return (
              <tr key={p.date}>
                <td>
                  <span className="day-dot">D{p.day}</span> {fmtDate(p.date, { weekday: "short", day: "numeric", month: "short" })}
                </td>
                <td className="num mono">{fmtUsd(p.predicted_close)}</td>
                <td className="num">
                  <div className="bar-cell">
                    <span className={`mono ${pos ? "up" : "down"}`}>{fmtPct(p.change_pct)}</span>
                    <span className="mini-bar">
                      <span
                        className={pos ? "pos" : "neg"}
                        style={{ width: `${(Math.abs(p.change_pct) / maxAbs) * 100}%` }}
                      />
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
          {!preds.length && (
            <tr>
              <td colSpan={3} className="muted center">
                No forecast yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
