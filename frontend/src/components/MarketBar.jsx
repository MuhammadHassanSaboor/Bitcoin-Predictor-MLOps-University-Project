import { useEffect, useState } from "react";
import { fmtCompact, fmtPct, fmtUsd, signalFrom } from "../api";

function Stat({ label, value, tone }) {
  return (
    <div className="mb-stat">
      <span className="label">{label}</span>
      <span className={`value num ${tone || ""}`}>{value}</span>
    </div>
  );
}

// Exchange-style header: symbol, live price, 24h stats and forecast summary.
export default function MarketBar({ live, history, forecast }) {
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!live.direction) return undefined;
    setFlash(live.direction > 0 ? "tick-up" : "tick-down");
    const id = setTimeout(() => setFlash(""), 450);
    return () => clearTimeout(id);
  }, [live.price, live.direction]);

  const change = live.price != null && live.open24h ? live.price - live.open24h : null;
  const lastClose = history?.close?.at(-1);
  const d1 = forecast?.predictions?.[0];
  const d7 = forecast?.predictions?.at(-1);
  const signal = signalFrom(d7?.change_pct);
  const tone = (v) => (v == null ? "" : v >= 0 ? "up" : "down");

  return (
    <section className="marketbar" aria-label="Market summary">
      <div className="mb-symbol">
        <span className="coin">₿</span>
        <div className="mb-pair">
          <strong>BTC / USD</strong>
          <span>Bitcoin · Spot</span>
        </div>
      </div>

      <div className="mb-price">
        <span className={`value num ${flash}`}>{fmtUsd(live.price)}</span>
        <span className={`sub num ${tone(change)}`}>
          {change == null ? "Connecting to market feed…" : `${change >= 0 ? "+" : ""}${fmtUsd(change)} (${fmtPct(live.changePct)})`}
        </span>
      </div>

      <div className="mb-stats">
        <Stat label="24h High" value={fmtUsd(live.high24h)} />
        <Stat label="24h Low" value={fmtUsd(live.low24h)} />
        <Stat label="24h Volume (BTC)" value={fmtCompact(live.volume24h)} />
        <Stat label="24h Volume (USD)" value={live.quoteVolume24h ? `$${fmtCompact(live.quoteVolume24h)}` : "—"} />
        <Stat label="Last daily close" value={fmtUsd(lastClose)} />
        <Stat label="Next-day forecast" value={fmtUsd(d1?.predicted_close)} tone={tone(d1?.change_pct)} />
        <Stat label="7-day target" value={fmtUsd(d7?.predicted_close)} tone={tone(d7?.change_pct)} />
        <div className="mb-stat">
          <span className="label">Model signal</span>
          <span className={`value ${signal.tone}`}>{signal.label}</span>
        </div>
      </div>
    </section>
  );
}
