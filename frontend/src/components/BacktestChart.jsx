import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// Latest held-out 7-day window: actual vs model vs naive baseline.
export default function BacktestChart({ metrics, theme, height = 300 }) {
  const c = chartColors(theme);
  const tw = metrics?.test_window;
  if (!tw) return <div className="skeleton" style={{ height, margin: 12 }} />;

  const x = [tw.origin_date, ...tw.dates];
  const line = (name, y, color, extra = {}) => ({
    type: "scatter",
    mode: "lines+markers",
    name,
    x,
    y: [tw.origin_close, ...y],
    line: { color, width: 2, ...extra.line },
    marker: { size: 6, color, ...extra.marker },
    hovertemplate: `%{y:,.0f}<extra>${name}</extra>`,
  });
  const base = baseLayout(c);

  return (
    <Plot
      data={[
        line("Actual", tw.actual, c.brand),
        line("Model", tw.predicted, c.forecast, { line: { dash: "dot" }, marker: { symbol: "diamond" } }),
        line("Naive", tw.naive, c.naive, { line: { dash: "dash", width: 1.5 }, marker: { size: 0 } }),
      ]}
      layout={{
        ...base,
        height,
        showlegend: true,
        legend: { ...base.legend, y: 1.12 },
        margin: { l: 8, r: 64, t: 30, b: 28 },
        xaxis: { ...base.xaxis, type: "date", showgrid: false },
        yaxis: { ...base.yaxis, tickformat: ",.0f" },
      }}
      config={{ ...plotConfig, displayModeBar: false }}
      useResizeHandler
      style={{ width: "100%" }}
    />
  );
}
