import { useMemo, useState } from "react";
import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";
import { fmtUsd } from "../api";

const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "MAX", days: 400 },
];

function movingAverage(values, n) {
  return values.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += values[j];
    return s / n;
  });
}

function Toggle({ active, onClick, children, color }) {
  return (
    <button className={`toggle ${active ? "active" : ""}`} onClick={onClick}>
      {color && <span className="swatch" style={{ background: color }} />}
      {children}
    </button>
  );
}

export default function PriceChart({ history, forecast, live, theme, loading }) {
  const [range, setRange] = useState("3M");
  const [style, setStyle] = useState("candles");
  const [show, setShow] = useState({ ma7: true, ma30: true, volume: true, forecast: true });
  const c = chartColors(theme);

  const { traces, layout } = useMemo(() => {
    if (!history?.close?.length) return { traces: [], layout: {} };
    const days = RANGES.find((r) => r.key === range).days;
    const ma7All = movingAverage(history.close, 7);
    const ma30All = movingAverage(history.close, 30);
    const start = Math.max(0, history.close.length - days);
    const sl = (arr) => arr.slice(start);
    const x = sl(history.dates);
    const close = sl(history.close);
    const t = [];

    if (style === "candles") {
      t.push({
        type: "candlestick",
        name: "BTC/USD",
        x,
        open: sl(history.open),
        high: sl(history.high),
        low: sl(history.low),
        close,
        increasing: { line: { color: c.up, width: 1 }, fillcolor: c.up },
        decreasing: { line: { color: c.down, width: 1 }, fillcolor: c.down },
        whiskerwidth: 0.4,
        yaxis: "y",
      });
    } else {
      t.push({
        type: "scatter",
        mode: "lines",
        name: "Close",
        x,
        y: close,
        line: { color: c.accent, width: 2 },
        fill: "tozeroy",
        fillcolor: c.dark ? "rgba(247,147,26,0.08)" : "rgba(247,147,26,0.10)",
        hovertemplate: "%{y:$,.2f}<extra>Close</extra>",
      });
    }

    if (show.ma7)
      t.push({
        type: "scatter",
        mode: "lines",
        name: "MA 7",
        x,
        y: sl(ma7All),
        line: { color: c.ma7, width: 1.4 },
        hovertemplate: "%{y:$,.0f}<extra>MA 7</extra>",
      });
    if (show.ma30)
      t.push({
        type: "scatter",
        mode: "lines",
        name: "MA 30",
        x,
        y: sl(ma30All),
        line: { color: c.ma30, width: 1.4 },
        hovertemplate: "%{y:$,.0f}<extra>MA 30</extra>",
      });

    const lastDate = history.dates.at(-1);
    const lastClose = history.close.at(-1);
    const preds = forecast?.predictions || [];
    if (show.forecast && preds.length) {
      const fx = [lastDate, ...preds.map((p) => p.date)];
      t.push({
        type: "scatter",
        mode: "lines",
        x: fx,
        y: [lastClose, ...preds.map((p) => p.upper_80)],
        line: { width: 0 },
        hoverinfo: "skip",
        showlegend: false,
      });
      t.push({
        type: "scatter",
        mode: "lines",
        name: "80% range",
        x: fx,
        y: [lastClose, ...preds.map((p) => p.lower_80)],
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: c.band,
        hovertemplate: "%{y:$,.0f}<extra>low 80%</extra>",
      });
      t.push({
        type: "scatter",
        mode: "lines+markers",
        name: "Forecast",
        x: fx,
        y: [lastClose, ...preds.map((p) => p.predicted_close)],
        line: { color: c.forecast, width: 2.4, dash: "dot" },
        marker: { size: 6, color: c.forecast },
        hovertemplate: "%{y:$,.2f}<extra>Forecast</extra>",
      });
    }

    if (live?.price) {
      const today = new Date().toISOString().slice(0, 10);
      t.push({
        type: "scatter",
        mode: "markers",
        name: "Live",
        x: [today],
        y: [live.price],
        marker: { size: 11, color: c.accent, line: { color: "#fff", width: 2 }, symbol: "circle" },
        hovertemplate: "%{y:$,.2f}<extra>Live</extra>",
      });
    }

    if (show.volume) {
      const vol = sl(history.volume);
      const open = sl(history.open);
      t.push({
        type: "bar",
        name: "Volume",
        x,
        y: vol,
        yaxis: "y2",
        marker: { color: close.map((cl, i) => (cl >= open[i] ? c.volUp : c.volDown)) },
        hovertemplate: "%{y:.3s}<extra>Volume</extra>",
        showlegend: false,
      });
    }

    const base = baseLayout(c);
    const l = {
      ...base,
      height: 600,
      margin: { l: 10, r: 64, t: 30, b: 30 },
      dragmode: "pan",
      xaxis: {
        ...base.xaxis,
        type: "date",
        rangeslider: { visible: false },
        showspikes: true,
        spikemode: "across",
        spikecolor: c.muted,
        spikethickness: 1,
        spikedash: "dot",
      },
      yaxis: {
        ...base.yaxis,
        domain: show.volume ? [0.22, 1] : [0, 1],
        tickprefix: "$",
        tickformat: ",.0f",
        showspikes: true,
        spikemode: "across",
        spikecolor: c.muted,
        spikethickness: 1,
        spikedash: "dot",
      },
      yaxis2: {
        domain: [0, 0.17],
        showgrid: false,
        side: "right",
        tickfont: { color: c.muted, size: 10 },
        tickformat: ".2s",
      },
      shapes: [
        {
          type: "line",
          x0: lastDate,
          x1: lastDate,
          yref: "paper",
          y0: 0,
          y1: 1,
          line: { color: c.muted, width: 1, dash: "dash" },
        },
      ],
      annotations: [
        {
          x: lastDate,
          y: 1,
          yref: "paper",
          text: "last close",
          showarrow: false,
          xanchor: "right",
          yanchor: "bottom",
          font: { size: 10, color: c.muted },
        },
      ],
    };
    return { traces: t, layout: l };
  }, [history, forecast, live?.price, range, style, show, theme]);

  const flip = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));
  const lastClose = history?.close?.at(-1);

  return (
    <section className="card chart-card">
      <div className="card-head">
        <div>
          <h2>Price chart</h2>
          <p className="muted">
            Daily candles · last close <span className="mono">{fmtUsd(lastClose)}</span>
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              className={range === r.key ? "active" : ""}
              onClick={() => setRange(r.key)}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="seg small">
          <button className={style === "candles" ? "active" : ""} onClick={() => setStyle("candles")}>
            Candles
          </button>
          <button className={style === "line" ? "active" : ""} onClick={() => setStyle("line")}>
            Line
          </button>
        </div>
        <Toggle active={show.ma7} onClick={() => flip("ma7")} color={c.ma7}>
          MA 7
        </Toggle>
        <Toggle active={show.ma30} onClick={() => flip("ma30")} color={c.ma30}>
          MA 30
        </Toggle>
        <Toggle active={show.volume} onClick={() => flip("volume")}>
          Volume
        </Toggle>
        <Toggle active={show.forecast} onClick={() => flip("forecast")} color={c.forecast}>
          7-day forecast
        </Toggle>
      </div>

      {loading && !traces.length ? (
        <div className="skeleton" style={{ height: 600 }} />
      ) : (
        <Plot
          data={traces}
          layout={layout}
          config={{ ...plotConfig, scrollZoom: true }}
          useResizeHandler
          style={{ width: "100%" }}
        />
      )}
    </section>
  );
}
