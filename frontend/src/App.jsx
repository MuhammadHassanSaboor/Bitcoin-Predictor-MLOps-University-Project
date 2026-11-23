import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useTheme } from "./hooks/useTheme";
import { useLivePrice } from "./hooks/useLivePrice";
import Navbar from "./components/Navbar";
import TickerTape from "./components/TickerTape";
import PriceChart from "./components/PriceChart";
import ForecastPanel from "./components/ForecastPanel";
import MetricsCards from "./components/MetricsCards";
import BacktestChart from "./components/BacktestChart";
import Leaderboard from "./components/Leaderboard";
import WhatIf from "./components/WhatIf";
import LiveTape from "./components/LiveTape";

const REFRESH_MS = 60_000;

export default function App() {
  const { theme, toggle } = useTheme();
  const live = useLivePrice();

  const [health, setHealth] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [history, setHistory] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [days, setDays] = useState(7);
  const [running, setRunning] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [banner, setBanner] = useState("");

  const runForecast = useCallback(async (d) => {
    setRunning(true);
    try {
      setForecast(await api.predict({ forecast_days: d }));
      setForecastError("");
    } catch (e) {
      setForecastError(e.message);
    } finally {
      setRunning(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
      setApiOnline(true);
      setBanner(h.model_loaded ? "" : "The API is running but no model is loaded yet.");
      if (!h.model_loaded) return;
      const [hist, m] = await Promise.all([api.history(400), api.metrics()]);
      setHistory(hist);
      setMetrics(m);
      setLastSync(new Date());
    } catch (e) {
      setApiOnline(false);
      setBanner(`Cannot reach the forecast API (${e.message}). Is the Flask service running?`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Re-run the forecast when the model version changes (e.g. after Airflow retrains).
  useEffect(() => {
    if (health?.model_loaded) runForecast(days);
  }, [health?.model_version]); // only when the version changes

  return (
    <div className="app">
      <Navbar live={live} health={health} apiOnline={apiOnline} theme={theme} onToggleTheme={toggle} />
      <TickerTape live={live} history={history} forecast={forecast} metrics={metrics} />

      <main className="container">
        {banner && <div className="banner">{banner}</div>}

        <div className="page-title">
          <div>
            <h1>Bitcoin 7-Day Price Forecast</h1>
            <p className="muted">
              Daily BTC-USD data · retrained by Airflow · served by Flask on Kubernetes
            </p>
          </div>
          <div className="sync muted small">
            {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Syncing…"}
            <button className="ghost-btn" onClick={refresh}>
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="grid top">
          <PriceChart history={history} forecast={forecast} live={live} theme={theme} loading={loading} />
          <ForecastPanel
            forecast={forecast}
            days={days}
            setDays={(d) => {
              setDays(d);
              runForecast(d);
            }}
            onRun={() => runForecast(days)}
            running={running}
            error={forecastError}
          />
        </div>

        <MetricsCards metrics={metrics} />

        <div className="grid halves">
          <BacktestChart metrics={metrics} theme={theme} />
          <Leaderboard metrics={metrics} theme={theme} />
        </div>

        <div className="grid top">
          <WhatIf history={history} baseForecast={days === 7 ? forecast : null} theme={theme} />
          <LiveTape live={live} health={health} theme={theme} />
        </div>
      </main>

      <footer className="footer muted small">
        <span>
          Data: Yahoo Finance (daily) · Live feed: {live.source} · Model {metrics?.model_version || "—"} trained{" "}
          {metrics?.trained_at ? new Date(metrics.trained_at).toLocaleString() : "—"}
        </span>
        <span>MLOps Assignment 3 · Forecasts are for learning purposes, not financial advice.</span>
      </footer>
    </div>
  );
}
