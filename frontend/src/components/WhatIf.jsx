import { useEffect, useMemo, useState } from "react";
import Plot from "./Plot";
import { api, fmtPct, fmtUsd } from "../api";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

// "What if BTC moved X% over the last N days?" -> sends a custom history to /predict.
export default function WhatIf({ history, baseForecast, theme }) {
  const [shock, setShock] = useState(-8);
  const [spread, setSpread] = useState(3);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const c = chartColors(theme);

  const scenario = useMemo(() => {
    if (!history?.close?.length) return null;
    const closes = history.close.slice(-120);
    // Spread the shock over the last `spread` days (smooth ramp).
    const out = closes.map((v, i) => {
      const k = i - (closes.length - spread);
      if (k < 0) return v;
      const frac = (k + 1) / spread;
      return v * (1 + (shock / 100) * frac);
    });
    return { closes: out, lastDate: history.dates.at(-1) };
  }, [history, shock, spread]);

  useEffect(() => {
    if (!scenario) return;
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await api.predict({
          forecast_days: 7,
          history: scenario.closes.map((v) => Math.round(v * 100) / 100),
          last_date: scenario.lastDate,
        });
        setResult(res);
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [scenario]);

  const base = baseLayout(c);
  const recentX = history?.dates?.slice(-21) || [];
  const recentReal = history?.close?.slice(-21) || [];
  const recentScen = scenario?.closes.slice(-21) || [];
  const lastX = recentX.at(-1);

  const traces = [
    {
      type: "scatter",
      mode: "lines",
      name: "Real history",
      x: recentX,
      y: recentReal,
      line: { color: c.naive, width: 2 },
      hovertemplate: "%{y:$,.0f}<extra>Real</extra>",
    },
    {
      type: "scatter",
      mode: "lines",
      name: "Scenario history",
      x: recentX,
      y: recentScen,
      line: { color: c.accent, width: 2 },
      hovertemplate: "%{y:$,.0f}<extra>Scenario</extra>",
    },
  ];
  if (baseForecast?.predictions?.length)
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      name: "Base forecast",
      x: [lastX, ...baseForecast.predictions.map((p) => p.date)],
      y: [recentReal.at(-1), ...baseForecast.predictions.map((p) => p.predicted_close)],
      line: { color: c.ma7, width: 2, dash: "dot" },
      marker: { size: 5 },
      hovertemplate: "%{y:$,.0f}<extra>Base</extra>",
    });
  if (result?.predictions?.length)
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      name: "Scenario forecast",
      x: [lastX, ...result.predictions.map((p) => p.date)],
      y: [recentScen.at(-1), ...result.predictions.map((p) => p.predicted_close)],
      line: { color: c.forecast, width: 2.5, dash: "dot" },
      marker: { size: 6 },
      hovertemplate: "%{y:$,.0f}<extra>Scenario</extra>",
    });

  const scen7 = result?.predictions?.at(-1);

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>What-if simulator</h2>
          <p className="muted">Send a modified price history to /predict and see how the model reacts</p>
        </div>
        {busy && <span className="spinner" />}
      </div>

      <div className="whatif-grid">
        <div className="controls">
          <label className="field-label" htmlFor="shock">
            Price move <b className={`mono ${shock >= 0 ? "up" : "down"}`}>{fmtPct(shock, 0)}</b>
          </label>
          <input
            id="shock"
            type="range"
            min={-30}
            max={30}
            step={1}
            value={shock}
            onChange={(e) => setShock(Number(e.target.value))}
          />
          <label className="field-label" htmlFor="spread">
            Spread over last <b className="mono">{spread}</b> day{spread > 1 ? "s" : ""}
          </label>
          <input
            id="spread"
            type="range"
            min={1}
            max={14}
            step={1}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
          />
          <div className="presets">
            {[
              ["Crash", -20, 2],
              ["Dip", -8, 3],
              ["Flat", 0, 1],
              ["Rally", 10, 5],
              ["Pump", 25, 2],
            ].map(([name, s, d]) => (
              <button
                key={name}
                className="toggle"
                onClick={() => {
                  setShock(s);
                  setSpread(d);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="scenario-out">
            <span className="muted small">Scenario 7-day target</span>
            <span className="mono big">{fmtUsd(scen7?.predicted_close, 0)}</span>
            {scen7 && (
              <span className={`chip ${scen7.change_pct >= 0 ? "up" : "down"}`}>
                {fmtPct(scen7.change_pct)} from scenario close
              </span>
            )}
          </div>
          {error && <div className="error-box">{error}</div>}
        </div>
        <Plot
          data={traces}
          layout={{
            ...base,
            height: 320,
            margin: { l: 10, r: 64, t: 30, b: 30 },
            yaxis: { ...base.yaxis, tickprefix: "$", tickformat: ",.0f" },
            xaxis: { ...base.xaxis, type: "date" },
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%" }}
        />
      </div>
    </section>
  );
}
