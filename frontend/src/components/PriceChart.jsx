import { useMemo, useState } from "react";
import Plot from "./Plot";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";
import { fmtCompact, fmtNum, fmtPct } from "../api";

const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "All", days: 400 },
];

function movingAverage(values, n) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export default function PriceChart({ history, forecast, live, theme, height = 560 }) {
  const [range, setRange] = useState("6M");
  const [style, setStyle] = useState("candles");
  const [show, setShow] = useState({ ma7: true, ma30: true, volume: true, forecast: true });
  const c = chartColors(theme);
  const flip = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const data = useMemo(() => {
    if (!history?.close?.length) return null;
    const days = RANGES.find((r) => r.key === range).days;
    const start = Math.max(0, history.close.length - days);
    const sl = (a) => a.slice(start);
    const ma7 = movingAverage(history.close, 7);
    const ma30 = movingAverage(history.close, 30);
    return {
      x: sl(history.dates),
      open: sl(history.open),
      high: sl(history.high),
      low: sl(history.low),
      close: sl(history.close),
      volume: sl(history.volume),
      ma7: sl(ma7),
      ma30: sl(ma30),
      lastMa7: ma7.at(-1),
      lastMa30: ma30.at(-1),
    };
  }, [history, range]);

  const { traces, layout } = useMemo(() => {
    if (!data) return { traces: [], layout: {} };
    const t = [];
    const { x, close } = data;
    const lastDate = x.at(-1);
    const lastClose = close.at(-1);

    if (style === "candles") {
      t.push({
        type: "candlestick",
        name: "BTC/USD",
        x,
        open: data.open,
        high: data.high,
        low: data.low,
        close,
        increasing: { line: { color: c.up, width: 1 }, fillcolor: c.up },
        decreasing: { line: { color: c.down, width: 1 }, fillcolor: c.down },
        whiskerwidth: 0,
      });
    } else {
      t.push({
        type: "scatter",
        mode: "lines",
        name: "Close",
        x,
        y: close,
        line: { color: c.brand, width: 1.8 },
        fill: style === "area" ? "tozeroy" : "none",
        fillcolor: c.dark ? "rgba(247,147,26,0.07)" : "rgba(232,130,12,0.07)",
        hovertemplate: "%{y:,.2f}<extra>Close</extra>",
      });
    }
    if (show.ma7)
      t.push({
        type: "scatter",
        mode: "lines",
        name: "MA 7",
        x,
        y: data.ma7,
        line: { color: c.ma7, width: 1.2 },
        hovertemplate: "%{y:,.0f}<extra>MA 7</extra>",
      });
    if (show.ma30)
      t.push({
        type: "scatter",
        mode: "lines",
        name: "MA 30",
        x,
        y: data.ma30,
        line: { color: c.ma30, width: 1.2 },
        hovertemplate: "%{y:,.0f}<extra>MA 30</extra>",
      });

    const preds = forecast?.predictions || [];
    const shapes = [];
    const annotations = [];
    if (show.forecast && preds.length) {
      const fx = [lastDate, ...preds.map((p) => p.date)];
      t.push({
        type: "scatter",
        mode: "lines",
        x: fx,
        y: [lastClose, ...preds.map((p) => p.upper_80)],
        line: { width: 0 },
        hoverinfo: "skip",
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
        hoverinfo: "skip",
      });
      t.push({
        type: "scatter",
        mode: "lines+markers",
        name: "Forecast",
        x: fx,
        y: [lastClose, ...preds.map((p) => p.predicted_close)],
        line: { color: c.forecast, width: 2, dash: "dot" },
        marker: { size: 5, color: c.forecast, line: { color: c.surface, width: 1 } },
        hovertemplate: "%{y:,.2f}<extra>Forecast</extra>",
      });
      shapes.push({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: lastDate,
        x1: preds.at(-1).date,
        y0: 0,
        y1: 1,
        fillcolor: c.zone,
        line: { width: 0 },
        layer: "below",
      });
      annotations.push({
        x: preds.at(-1).date,
        y: 1,
        xref: "x",
        yref: "paper",
        text: "FORECAST",
        showarrow: false,
        xanchor: "right",
        yanchor: "top",
        font: { size: 10, color: c.forecast, family: "Inter" },
      });
    }

    if (live?.price) {
      t.push({
        type: "scatter",
        mode: "markers",
        name: "Live",
        x: [new Date().toISOString().slice(0, 10)],
        y: [live.price],
        marker: { size: 8, color: c.brand, line: { color: c.surface, width: 2 } },
        hovertemplate: "%{y:,.2f}<extra>Live</extra>",
      });
    }

    // Price tag on the right axis (like trading terminals).
    const tagPrice = live?.price || lastClose;
    const tagUp = tagPrice >= (data.open.at(-1) ?? tagPrice);
    shapes.push({
      type: "line",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: tagPrice,
      y1: tagPrice,
      line: { color: tagUp ? c.up : c.down, width: 1, dash: "dot" },
    });
    annotations.push({
      xref: "paper",
      x: 1,
      yref: "y",
      y: tagPrice,
      text: fmtNum(tagPrice, 0),
      showarrow: false,
      xanchor: "left",
      bgcolor: tagUp ? c.up : c.down,
      font: { color: "#fff", size: 11, family: "JetBrains Mono, monospace" },
      borderpad: 3,
    });

    if (show.volume) {
      t.push({
        type: "bar",
        name: "Volume",
        x,
        y: data.volume,
        yaxis: "y2",
        marker: { color: close.map((cl, i) => (cl >= data.open[i] ? c.volUp : c.volDown)) },
        hovertemplate: "%{y:.3s}<extra>Volume</extra>",
      });
    }

    const base = baseLayout(c);
    const spike = { showspikes: true, spikemode: "across", spikecolor: c.muted, spikethickness: 1, spikedash: "dot", spikesnap: "cursor" };
    return {
      traces: t,
      layout: {
        ...base,
        height,
        margin: { l: 8, r: 70, t: 10, b: 28 },
        dragmode: "pan",
        bargap: 0.25,
        xaxis: { ...base.xaxis, ...spike, type: "date", rangeslider: { visible: false }, showgrid: false },
        yaxis: { ...base.yaxis, ...spike, domain: show.volume ? [0.2, 1] : [0, 1], tickformat: ",.0f" },
        yaxis2: { domain: [0, 0.15], showgrid: false, showticklabels: false, zeroline: false },
        shapes,
        annotations,
      },
    };
  }, [data, forecast, live?.price, style, show, theme, height]);

  // Values for the OHLC readout above the chart.
  const last = data && {
    o: data.open.at(-1),
    h: data.high.at(-1),
    l: data.low.at(-1),
    c: data.close.at(-1),
    v: data.volume.at(-1),
  };
  const chg = last ? ((last.c - last.o) / last.o) * 100 : null;

  return (
    <section className="panel">
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.key} role="tab" aria-selected={range === r.key} className={range === r.key ? "active" : ""} onClick={() => setRange(r.key)}>
              {r.key}
            </button>
          ))}
        </div>
        <span className="divider" />
        <div className="seg" aria-label="Chart type">
          {[
            ["candles", "Candles"],
            ["line", "Line"],
            ["area", "Area"],
          ].map(([k, label]) => (
            <button key={k} className={style === k ? "active" : ""} onClick={() => setStyle(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="divider" />
        <button className={`chip ${show.ma7 ? "active" : ""}`} onClick={() => flip("ma7")} aria-pressed={show.ma7}>
          <span className="swatch" style={{ background: c.ma7 }} /> MA 7
        </button>
        <button className={`chip ${show.ma30 ? "active" : ""}`} onClick={() => flip("ma30")} aria-pressed={show.ma30}>
          <span className="swatch" style={{ background: c.ma30 }} /> MA 30
        </button>
        <button className={`chip ${show.volume ? "active" : ""}`} onClick={() => flip("volume")} aria-pressed={show.volume}>
          <span className="swatch" style={{ background: c.muted }} /> Volume
        </button>
        <button className={`chip ${show.forecast ? "active" : ""}`} onClick={() => flip("forecast")} aria-pressed={show.forecast}>
          <span className="swatch" style={{ background: c.forecast }} /> Forecast
        </button>
        <span className="push muted" style={{ fontSize: 11.5 }}>
          1D candles · Yahoo Finance
        </span>
      </div>

      {last ? (
        <div className="chart-legend num">
          <span>
            O <b>{fmtNum(last.o)}</b>
          </span>
          <span>
            H <b>{fmtNum(last.h)}</b>
          </span>
          <span>
            L <b>{fmtNum(last.l)}</b>
          </span>
          <span>
            C <b>{fmtNum(last.c)}</b>
          </span>
          <span className={chg >= 0 ? "up" : "down"}>{fmtPct(chg)}</span>
          <span>
            Vol <b>{fmtCompact(last.v)}</b>
          </span>
          {show.ma7 && (
            <span style={{ color: c.ma7 }}>
              MA7 <b style={{ color: c.ma7 }}>{fmtNum(data.lastMa7, 0)}</b>
            </span>
          )}
          {show.ma30 && (
            <span style={{ color: c.ma30 }}>
              MA30 <b style={{ color: c.ma30 }}>{fmtNum(data.lastMa30, 0)}</b>
            </span>
          )}
        </div>
      ) : null}

      <div className="panel-body flush">
        {traces.length ? (
          <Plot data={traces} layout={layout} config={{ ...plotConfig, scrollZoom: true }} useResizeHandler style={{ width: "100%" }} />
        ) : (
          <div className="skeleton" style={{ height, margin: 10 }} />
        )}
      </div>
    </section>
  );
}
