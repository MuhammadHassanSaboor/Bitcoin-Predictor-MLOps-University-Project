import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

const short = (r) =>
  r.family.startsWith("ensemble")
    ? r.model.replace("Ensemble", "Ens.").replace("Random Forest", "RF").replace("Ridge Regression", "Ridge")
    : r.model;

// Every model family tried, ranked by walk-forward CV MAPE (lower is better).
export default function Leaderboard({ metrics, theme, height = 300 }) {
  const c = chartColors(theme);
  const rows = [...(metrics?.leaderboard || [])].sort((a, b) => b.cv_mape - a.cv_mape);
  if (!rows.length) return <div className="skeleton" style={{ height, margin: 12 }} />;

  const winner = metrics.model_name;
  const vals = rows.map((r) => r.cv_mape);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.5 || 0.05;
  const base = baseLayout(c);

  return (
    <Plot
      data={[
        {
          type: "bar",
          orientation: "h",
          x: vals,
          y: rows.map(short),
          marker: {
            color: rows.map((r) => (r.family === "naive" ? c.naive : r.model === winner ? c.up : c.forecast)),
          },
          text: vals.map((v) => `${v.toFixed(3)}%`),
          textposition: "outside",
          cliponaxis: false,
          textfont: { family: "JetBrains Mono, monospace", size: 11, color: c.text2 },
          hovertemplate: "%{y}<br>CV MAPE %{x:.3f}%<extra></extra>",
        },
      ]}
      layout={{
        ...base,
        height,
        hovermode: "closest",
        bargap: 0.4,
        margin: { l: 8, r: 64, t: 8, b: 28 },
        xaxis: { ...base.xaxis, range: [Math.max(0, min - pad), max + pad], ticksuffix: "%" },
        yaxis: { ...base.yaxis, side: "left", automargin: true, showgrid: false, tickfont: { color: c.text2, size: 11.5 } },
      }}
      config={{ ...plotConfig, displayModeBar: false }}
      useResizeHandler
      style={{ width: "100%" }}
    />
  );
}
