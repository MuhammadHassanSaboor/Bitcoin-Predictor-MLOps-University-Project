import { fmtDate, fmtPct, fmtUsd, signalFrom } from "../api";
import { IconBolt } from "./Icons";

// Side panel: choose horizon, see the target, signal and key numbers.
export default function ForecastPanel({ forecast, metrics, days, onDays, onRun, running, error }) {
  const preds = forecast?.predictions || [];
  const target = preds.at(-1);
  const up = (target?.change_pct ?? 0) >= 0;
  const sig = signalFrom(target?.change_pct);
  const spread = target ? ((target.upper_80 - target.lower_80) / target.predicted_close) * 100 : null;

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <h2>Price forecast</h2>
          <p>Direct multi-horizon model · POST /predict</p>
        </div>
        <span className="badge info">{days}D</span>
      </div>

      <div className="panel-body" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="label-sm" style={{ marginBottom: 8 }}>
          Horizon
        </div>
        <div className="seg block" role="radiogroup" aria-label="Forecast horizon in days">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button key={d} role="radio" aria-checked={days === d} className={days === d ? "active" : ""} onClick={() => onDays(d)}>
              {d}D
            </button>
          ))}
        </div>
        <button className="btn btn-primary block" style={{ marginTop: 12 }} onClick={onRun} disabled={running}>
          {running ? <span className="spinner" /> : <IconBolt />}
          {running ? "Running forecast" : "Run forecast"}
        </button>
        {error && (
          <div className="alert" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      <div className="fc-target">
        <span className="label-sm">
          Target · {target ? fmtDate(target.date, { weekday: "short", month: "short", day: "numeric" }) : "—"}
        </span>
        <span className={`price num ${target ? (up ? "up" : "down") : ""}`}>{fmtUsd(target?.predicted_close)}</span>
        <div className="fc-row">
          <span className={`badge ${up ? "up" : "down"} num`}>{fmtPct(target?.change_pct)}</span>
          <span className="muted">vs last close {fmtUsd(forecast?.last_close, 0)}</span>
        </div>
      </div>

      <div className="signal">
        <div className="fc-row" style={{ justifyContent: "space-between" }}>
          <span className="label-sm">Model signal</span>
          <span className={`badge ${sig.tone}`}>{sig.label}</span>
        </div>
        <div className="meter" aria-hidden="true">
          <span className="needle" style={{ left: `${sig.score}%` }} />
        </div>
        <div className="meter-labels">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>

      <div className="panel-body">
        <dl className="kv">
          <dt>80% range</dt>
          <dd className="num">
            {target ? `${fmtUsd(target.lower_80, 0)} – ${fmtUsd(target.upper_80, 0)}` : "—"}
          </dd>
          <dt>Range width</dt>
          <dd className="num">{fmtPct(spread, 1, false)}</dd>
          <dt>Model</dt>
          <dd title={forecast?.model_name}>{forecast?.model_name?.replace("Ensemble ", "Ens. ") || "—"}</dd>
          <dt>Test MAPE</dt>
          <dd className="num">{metrics?.mape != null ? `${metrics.mape.toFixed(2)}%` : "—"}</dd>
          <dt>Data up to</dt>
          <dd className="num">{forecast?.last_date || "—"}</dd>
        </dl>
      </div>
    </section>
  );
}
