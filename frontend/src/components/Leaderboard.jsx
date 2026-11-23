import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// Every model family that was tried, ranked by walk-forward CV MAPE (lower = better).
export default function Leaderboard({ metrics, theme }) {
  const c = chartColors(theme);
  const rows = [...(metrics?.leaderboard || [])].sort((a, b) => b.cv_mape - a.cv_mape);
  const winner = metrics?.model_name;

  // Shorten ensemble names so the labels fit next to the bars.
  const label = (r) =>
    r.family.startsWith("ensemble")
      ? r.model
          .replace("Ensemble", "Ens.")
          .replace("Random Forest", "RF")
          .replace("Ridge Regression", "Ridge")
      : r.model;
  const colors = rows.map((r) =>
    r.family === "naive" ? c.naive : r.model === winner ? c.up : c.forecast,
  );

  const base = baseLayout(c);
  const min = Math.min(...rows.map((r) => r.cv_mape));
  const max = Math.max(...rows.map((r) => r.cv_mape));
  const pad = (max - min) * 0.6 || 0.05;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Model leaderboard</h2>
          <p className="muted">Walk-forward CV MAPE · green = deployed model · grey = naive baseline</p>
        </div>
      </div>
      {rows.length ? (
        <Plot
          data={[
            {
              type: "bar",
              orientation: "h",
              x: rows.map((r) => r.cv_mape),
              y: rows.map(label),
              marker: { color: colors, line: { width: 0 } },
              text: rows.map((r) => `${r.cv_mape.toFixed(3)}%`),
              textposition: "outside",
              cliponaxis: false,
              textfont: { family: "JetBrains Mono, monospace", size: 11, color: c.text },
              hovertemplate: "%{y}<br>CV MAPE %{x:.3f}%<extra></extra>",
            },
          ]}
          layout={{
            ...base,
            height: 300,
            showlegend: false,
            hovermode: "closest",
            margin: { l: 10, r: 70, t: 10, b: 30 },
            bargap: 0.35,
            xaxis: { ...base.xaxis, range: [Math.max(0, min - pad), max + pad], ticksuffix: "%" },
            yaxis: { ...base.yaxis, side: "left", automargin: true, gridcolor: "rgba(0,0,0,0)" },
          }}
          config={{ ...plotConfig, displayModeBar: false }}
          useResizeHandler
          style={{ width: "100%" }}
        />
      ) : (
        <div className="skeleton" style={{ height: 300 }} />
      )}
    </section>
  );
}
