import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// Latest validation run: model vs actual vs naive on the 7 held-out days.
export default function BacktestChart({ metrics, theme }) {
  const c = chartColors(theme);
  const tw = metrics?.test_window;

  const traces = tw
    ? [
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Actual",
          x: [tw.origin_date, ...tw.dates],
          y: [tw.origin_close, ...tw.actual],
          line: { color: c.accent, width: 2.5 },
          marker: { size: 7 },
          hovertemplate: "%{y:$,.0f}<extra>Actual</extra>",
        },
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Model",
          x: [tw.origin_date, ...tw.dates],
          y: [tw.origin_close, ...tw.predicted],
          line: { color: c.forecast, width: 2.5, dash: "dot" },
          marker: { size: 7, symbol: "diamond" },
          hovertemplate: "%{y:$,.0f}<extra>Model</extra>",
        },
        {
          type: "scatter",
          mode: "lines",
          name: "Naive",
          x: [tw.origin_date, ...tw.dates],
          y: [tw.origin_close, ...tw.naive],
          line: { color: c.naive, width: 1.5, dash: "dash" },
          hovertemplate: "%{y:$,.0f}<extra>Naive</extra>",
        },
      ]
    : [];

  const base = baseLayout(c);
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Backtest · latest 7-day window</h2>
          <p className="muted">
            Model trained only on data before {tw?.origin_date || "…"}, then compared with what really happened
          </p>
        </div>
      </div>
      {tw ? (
        <Plot
          data={traces}
          layout={{
            ...base,
            height: 300,
            margin: { l: 10, r: 64, t: 30, b: 30 },
            yaxis: { ...base.yaxis, tickprefix: "$", tickformat: ",.0f" },
            xaxis: { ...base.xaxis, type: "date" },
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%" }}
        />
      ) : (
        <div className="skeleton" style={{ height: 300 }} />
      )}
    </section>
  );
}
