import { useState } from "react";
import PriceChart from "../components/PriceChart";
import ForecastPanel from "../components/ForecastPanel";
import ForecastTable from "../components/ForecastTable";
import BacktestChart from "../components/BacktestChart";
import LiveTicks from "../components/LiveTicks";

const TABS = [
  ["forecast", "Forecast detail"],
  ["backtest", "Latest backtest"],
  ["live", "Live ticks"],
];

export default function TerminalView({ history, forecast, metrics, live, theme, days, onDays, onRun, running, error }) {
  const [tab, setTab] = useState("forecast");

  return (
    <div className="terminal">
      <div className="terminal-main">
        <PriceChart history={history} forecast={forecast} live={live} theme={theme} />

        <section className="panel">
          <div className="tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
            <span className="spacer" />
            {tab === "backtest" && metrics?.test_window && (
              <span className="muted" style={{ alignSelf: "center", fontSize: 11.5 }}>
                Trained on data before {metrics.test_window.origin_date}
              </span>
            )}
          </div>
          {tab === "forecast" && <ForecastTable forecast={forecast} />}
          {tab === "backtest" && (
            <div className="panel-body flush">
              <BacktestChart metrics={metrics} theme={theme} height={260} />
            </div>
          )}
          {tab === "live" && <LiveTicks live={live} theme={theme} height={240} />}
        </section>
      </div>

      <aside className="terminal-side">
        <ForecastPanel
          forecast={forecast}
          metrics={metrics}
          days={days}
          onDays={onDays}
          onRun={onRun}
          running={running}
          error={error}
        />
      </aside>
    </div>
  );
}
