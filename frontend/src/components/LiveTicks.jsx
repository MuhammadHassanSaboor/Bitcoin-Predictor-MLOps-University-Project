import Plot from "./Plot";
import { fmtUsd } from "../api";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// Real-time tick chart from the exchange feed (one point per update).
export default function LiveTicks({ live, theme, height = 240 }) {
  const c = chartColors(theme);
  const ticks = live.ticks;
  if (ticks.length < 2)
    return (
      <div className="panel-body muted" style={{ height, display: "grid", placeItems: "center" }}>
        Waiting for live ticks from the market feed…
      </div>
    );
  const prices = ticks.map((t) => t.p);
  const up = prices.at(-1) >= prices[0];
  const color = up ? c.up : c.down;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max((max - min) * 0.15, max * 0.00005);
  const base = baseLayout(c);

  return (
    <div className="panel-body flush">
      <div className="chart-legend num">
        <span>
          Ticks <b>{ticks.length}</b>
        </span>
        <span>
          High <b>{fmtUsd(max)}</b>
        </span>
        <span>
          Low <b>{fmtUsd(min)}</b>
        </span>
        <span className={up ? "up" : "down"}>
          Session {up ? "+" : ""}
          {fmtUsd(prices.at(-1) - prices[0])}
        </span>
      </div>
      <Plot
        data={[
          {
            type: "scatter",
            mode: "lines",
            x: ticks.map((t) => new Date(t.t)),
            y: prices,
            line: { color, width: 1.6, shape: "linear" },
            fill: "tozeroy",
            fillcolor: up ? "rgba(24,196,124,0.08)" : "rgba(240,70,79,0.08)",
            hovertemplate: "%{y:,.2f}<extra></extra>",
          },
        ]}
        layout={{
          ...base,
          height,
          margin: { l: 8, r: 70, t: 8, b: 28 },
          xaxis: { ...base.xaxis, showgrid: false, tickformat: "%H:%M:%S" },
          yaxis: { ...base.yaxis, range: [min - pad, max + pad], tickformat: ",.0f" },
        }}
        config={{ ...plotConfig, displayModeBar: false }}
        useResizeHandler
        style={{ width: "100%" }}
      />
    </div>
  );
}
