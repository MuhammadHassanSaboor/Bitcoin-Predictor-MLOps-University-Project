import { fmtCompact, fmtPct, fmtUsd } from "../api";

// Scrolling market strip like on trading terminals.
export default function TickerTape({ live, history, forecast, metrics }) {
  const closes = history?.close || [];
  const lastClose = closes.at(-1);
  const prevClose = closes.at(-2);
  const week = closes.at(-8);
  const day7 = forecast?.predictions?.at(-1);
  const day1 = forecast?.predictions?.[0];

  const items = [
    { label: "24h High", value: fmtUsd(live.high24h) },
    { label: "24h Low", value: fmtUsd(live.low24h) },
    { label: "24h Vol (BTC)", value: fmtCompact(live.volume24h) },
    { label: "24h Vol (USD)", value: `$${fmtCompact(live.quoteVolume24h)}` },
    {
      label: "Last daily close",
      value: fmtUsd(lastClose),
      delta: lastClose && prevClose ? ((lastClose - prevClose) / prevClose) * 100 : null,
    },
    {
      label: "7d change",
      value: lastClose && week ? fmtPct(((lastClose - week) / week) * 100) : "—",
      delta: lastClose && week ? ((lastClose - week) / week) * 100 : null,
      hideValueDelta: true,
    },
    { label: "Next-day forecast", value: fmtUsd(day1?.predicted_close), delta: day1?.change_pct },
    { label: "7-day forecast", value: fmtUsd(day7?.predicted_close), delta: day7?.change_pct },
    { label: "Model MAPE", value: metrics?.mape != null ? `${metrics.mape.toFixed(2)}%` : "—" },
    { label: "Model", value: metrics?.model_name || "—" },
  ];

  const row = items.map((it, i) => (
    <span className="tape-item" key={i}>
      <span className="tape-label">{it.label}</span>
      <span className="tape-value mono">{it.value}</span>
      {it.delta != null && !it.hideValueDelta && (
        <span className={`tape-delta mono ${it.delta >= 0 ? "up" : "down"}`}>
          {it.delta >= 0 ? "▲" : "▼"} {fmtPct(it.delta)}
        </span>
      )}
    </span>
  ));

  return (
    <div className="tape" role="marquee" aria-label="Market summary">
      <div className="tape-track">
        <div className="tape-group">{row}</div>
        <div className="tape-group" aria-hidden="true">
          {row}
        </div>
      </div>
    </div>
  );
}
