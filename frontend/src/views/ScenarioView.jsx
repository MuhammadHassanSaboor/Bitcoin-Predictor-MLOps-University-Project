import { useEffect, useMemo, useState } from "react";
import Plot from "../components/Plot";
import { api, fmtPct, fmtUsd, signalFrom } from "../api";
import { baseLayout, chartColors, plotConfig } from "../hooks/useTheme";

const PRESETS = [
  ["Crash", -20, 2],
  ["Sell-off", -10, 4],
  ["Dip", -5, 2],
  ["Flat", 0, 1],
  ["Rally", 8, 5],
  ["Breakout", 15, 3],
];

// Sends a modified price history to POST /predict and compares with the base forecast.
export default function ScenarioView({ history, baseForecast, theme }) {
  const [shock, setShock] = useState(-10);
  const [spread, setSpread] = useState(4);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const c = chartColors(theme);

  const scenario = useMemo(() => {
    if (!history?.close?.length) return null;
    const closes = history.close.slice(-120);
    const out = closes.map((v, i) => {
      const k = i - (closes.length - spread);
      return k < 0 ? v : v * (1 + (shock / 100) * ((k + 1) / spread));
    });
    return { closes: out, lastDate: history.dates.at(-1) };
  }, [history, shock, spread]);

  useEffect(() => {
    if (!scenario) return undefined;
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        setResult(
          await api.predict({
            forecast_days: 7,
            history: scenario.closes.map((v) => Math.round(v * 100) / 100),
            last_date: scenario.lastDate,
          }),
        );
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [scenario]);

  const xs = history?.dates?.slice(-30) || [];
  const real = history?.close?.slice(-30) || [];
  const scen = scenario?.closes.slice(-30) || [];
  const lastX = xs.at(-1);
  const base7 = baseForecast?.predictions?.at(-1);
  const scen7 = result?.predictions?.at(-1);
  const sig = signalFrom(scen7?.change_pct);
  const b = baseLayout(c);

  const traces = [
    { type: "scatter", mode: "lines", name: "Real history", x: xs, y: real, line: { color: c.naive, width: 1.6 }, hovertemplate: "%{y:,.0f}<extra>Real</extra>" },
    { type: "scatter", mode: "lines", name: "Scenario history", x: xs, y: scen, line: { color: c.brand, width: 2 }, hovertemplate: "%{y:,.0f}<extra>Scenario</extra>" },
  ];
  if (baseForecast?.predictions?.length)
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      name: "Base forecast",
      x: [lastX, ...baseForecast.predictions.map((p) => p.date)],
      y: [real.at(-1), ...baseForecast.predictions.map((p) => p.predicted_close)],
      line: { color: c.ma7, width: 1.8, dash: "dot" },
      marker: { size: 5 },
      hovertemplate: "%{y:,.0f}<extra>Base</extra>",
    });
  if (result?.predictions?.length) {
    const fx = [lastX, ...result.predictions.map((p) => p.date)];
    traces.push(
      { type: "scatter", mode: "lines", x: fx, y: [scen.at(-1), ...result.predictions.map((p) => p.upper_80)], line: { width: 0 }, hoverinfo: "skip", showlegend: false },
      { type: "scatter", mode: "lines", name: "Scenario 80% range", x: fx, y: [scen.at(-1), ...result.predictions.map((p) => p.lower_80)], line: { width: 0 }, fill: "tonexty", fillcolor: c.band, hoverinfo: "skip" },
      {
        type: "scatter",
        mode: "lines+markers",
        name: "Scenario forecast",
        x: fx,
        y: [scen.at(-1), ...result.predictions.map((p) => p.predicted_close)],
        line: { color: c.forecast, width: 2.2, dash: "dot" },
        marker: { size: 6 },
        hovertemplate: "%{y:,.0f}<extra>Scenario</extra>",
      },
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scenario lab</h1>
          <p>Stress-test the model: change recent prices and send them to POST /predict as a custom history</p>
        </div>
        {busy && <span className="spinner" style={{ color: "var(--brand)" }} />}
      </div>

      <div className="scenario">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <h2>Scenario</h2>
              <p>Applied to the last 120 daily closes</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="field">
              <div className="field-head">
                <label htmlFor="shock">Price move</label>
                <span className={`num ${shock >= 0 ? "up" : "down"}`} style={{ fontWeight: 600 }}>
                  {fmtPct(shock, 0)}
                </span>
              </div>
              <input id="shock" type="range" min={-30} max={30} step={1} value={shock} onChange={(e) => setShock(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="field-head">
                <label htmlFor="spread">Spread over</label>
                <span className="num" style={{ fontWeight: 600 }}>
                  {spread} day{spread > 1 ? "s" : ""}
                </span>
              </div>
              <input id="spread" type="range" min={1} max={14} step={1} value={spread} onChange={(e) => setSpread(Number(e.target.value))} />
            </div>
            <div className="label-sm" style={{ marginBottom: 8 }}>
              Presets
            </div>
            <div className="presets">
              {PRESETS.map(([name, s, d]) => (
                <button
                  key={name}
                  className={`chip ${shock === s && spread === d ? "active" : ""}`}
                  style={{ justifyContent: "center" }}
                  onClick={() => {
                    setShock(s);
                    setSpread(d);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            {error && (
              <div className="alert" style={{ marginTop: 14 }}>
                {error}
              </div>
            )}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="compare">
            <div className="cell">
              <span className="label-sm">Base 7-day target</span>
              <span className="value num">{fmtUsd(base7?.predicted_close, 0)}</span>
              <span className={`num ${base7?.change_pct >= 0 ? "up" : "down"}`}>{fmtPct(base7?.change_pct)}</span>
            </div>
            <div className="cell">
              <span className="label-sm">Scenario 7-day target</span>
              <span className="value num">{fmtUsd(scen7?.predicted_close, 0)}</span>
              <span className={`num ${scen7?.change_pct >= 0 ? "up" : "down"}`}>{fmtPct(scen7?.change_pct)} from scenario close</span>
            </div>
            <div className="cell">
              <span className="label-sm">Scenario signal</span>
              <span className={`value ${sig.tone}`}>{sig.label}</span>
              <span className="muted">
                80% range {fmtUsd(scen7?.lower_80, 0)} – {fmtUsd(scen7?.upper_80, 0)}
              </span>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <h2>Real vs scenario</h2>
                <p>Last 30 days and the next 7</p>
              </div>
            </div>
            <div className="panel-body flush">
              <Plot
                data={traces}
                layout={{
                  ...b,
                  height: 420,
                  showlegend: true,
                  legend: { ...b.legend, y: 1.08 },
                  margin: { l: 8, r: 64, t: 30, b: 28 },
                  xaxis: { ...b.xaxis, type: "date", showgrid: false },
                  yaxis: { ...b.yaxis, tickformat: ",.0f" },
                }}
                config={plotConfig}
                useResizeHandler
                style={{ width: "100%" }}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
