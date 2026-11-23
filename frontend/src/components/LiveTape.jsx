import Plot from "./Plot";
import { fmtUsd } from "../api";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// Real-time tick chart (updates every second from the exchange feed).
export default function LiveTape({ live, health, theme }) {
  const c = chartColors(theme);
  const ticks = live.ticks;
  const first = ticks[0]?.p;
  const lastP = ticks.at(-1)?.p;
  const up = first == null || lastP >= first;
  const base = baseLayout(c);

  return (
    <section className="card live-card">
      <div className="card-head">
        <div>
          <h2>
            Live market <span className={`live-dot ${live.price ? "on" : ""}`} />
          </h2>
          <p className="muted">
            {live.source === "offline" ? "Feed offline" : `Streaming from ${live.source}`} ·{" "}
            {ticks.length} ticks
          </p>
        </div>
      </div>
      <div className="live-price mono">{fmtUsd(live.price)}</div>
      <Plot
        data={[
          {
            type: "scatter",
            mode: "lines",
            x: ticks.map((t) => new Date(t.t)),
            y: ticks.map((t) => t.p),
            line: { color: up ? c.up : c.down, width: 2, shape: "spline" },
            fill: "tozeroy",
            fillcolor: up ? "rgba(22,199,132,0.12)" : "rgba(234,57,67,0.12)",
            hovertemplate: "%{y:$,.2f}<extra></extra>",
          },
        ]}
        layout={{
          ...base,
          height: 150,
          showlegend: false,
          margin: { l: 0, r: 56, t: 4, b: 24 },
          xaxis: { ...base.xaxis, showgrid: false, tickformat: "%H:%M:%S" },
          yaxis: {
            ...base.yaxis,
            tickformat: ",.0f",
            range:
              ticks.length > 1
                ? [
                    Math.min(...ticks.map((t) => t.p)) * 0.9998,
                    Math.max(...ticks.map((t) => t.p)) * 1.0002,
                  ]
                : undefined,
          },
        }}
        config={{ ...plotConfig, displayModeBar: false, staticPlot: false }}
        useResizeHandler
        style={{ width: "100%" }}
      />
      <dl className="info-list">
        <div>
          <dt>Model</dt>
          <dd>{health?.model_name || "—"}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd className="mono">{health?.model_version || "—"}</dd>
        </div>
        <div>
          <dt>Served by pod</dt>
          <dd className="mono">{health?.pod || "—"}</dd>
        </div>
        <div>
          <dt>API uptime</dt>
          <dd className="mono">
            {health ? `${Math.floor(health.uptime_seconds / 60)}m ${Math.floor(health.uptime_seconds % 60)}s` : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
