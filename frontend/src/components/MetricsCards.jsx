import { fmtUsd } from "../api";

function Card({ label, value, sub, hint, tone }) {
  return (
    <div className={`kpi ${tone || ""}`} title={hint}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value mono">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

// GET /metrics -> error of the latest validation run (last 7 days held out).
export default function MetricsCards({ metrics }) {
  if (!metrics) {
    return (
      <section className="kpis">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi skeleton" style={{ height: 92 }} />
        ))}
      </section>
    );
  }
  const naive = metrics.baseline_naive || {};
  const better = naive.mape != null && metrics.mape < naive.mape;
  const gain = naive.mape ? ((naive.mape - metrics.mape) / naive.mape) * 100 : null;

  return (
    <section className="kpis">
      <Card
        label="MAE"
        value={fmtUsd(metrics.mae, 0)}
        sub={`naive ${fmtUsd(naive.mae, 0)}`}
        hint="Mean Absolute Error on the latest 7-day test window"
      />
      <Card
        label="RMSE"
        value={fmtUsd(metrics.rmse, 0)}
        sub={`naive ${fmtUsd(naive.rmse, 0)}`}
        hint="Root Mean Squared Error on the latest 7-day test window"
      />
      <Card
        label="MAPE"
        value={`${metrics.mape?.toFixed(2)}%`}
        sub={`naive ${naive.mape?.toFixed(2)}% · ${better ? `${gain.toFixed(1)}% better` : "baseline wins"}`}
        tone={better ? "good" : "warn"}
        hint="Mean Absolute Percentage Error on the latest 7-day test window"
      />
      <Card
        label="CV MAPE"
        value={`${metrics.cv?.mape?.toFixed(2)}%`}
        sub={`walk-forward · naive ${metrics.cv?.naive_mape?.toFixed(2)}%`}
        hint={metrics.cv?.method}
      />
      <Card
        label="Direction hit-rate"
        value={`${metrics.direction_accuracy?.toFixed(0)}%`}
        sub={`threshold ${metrics.threshold?.passed ? "passed ✓" : "failed ✗"} (MAPE < ${metrics.threshold?.mape_max}%)`}
        tone={metrics.threshold?.passed ? "good" : "warn"}
        hint="Share of the 7 test days where the predicted direction (up/down) was right"
      />
    </section>
  );
}
