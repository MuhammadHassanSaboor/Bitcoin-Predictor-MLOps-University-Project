import { useCallback, useEffect, useState } from "react";
import { api, latency } from "./api";
import { useTheme } from "./hooks/useTheme";
import { useLivePrice } from "./hooks/useLivePrice";
import { useHashRoute } from "./hooks/useHashRoute";
import TopBar from "./components/TopBar";
import MarketBar from "./components/MarketBar";
import StatusBar from "./components/StatusBar";
import TerminalView from "./views/TerminalView";
import ModelView from "./views/ModelView";
import ScenarioView from "./views/ScenarioView";
import ApiView from "./views/ApiView";

const REFRESH_MS = 60_000;

export default function App() {
  const { theme, toggle } = useTheme();
  const live = useLivePrice();
  const route = useHashRoute();

  const [health, setHealth] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [history, setHistory] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null); // forecast for the selected horizon
  const [forecast7, setForecast7] = useState(null); // always 7 days (market bar, scenario)
  const [days, setDays] = useState(7);
  const [running, setRunning] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [banner, setBanner] = useState("");

  const runForecast = useCallback(async (d) => {
    setRunning(true);
    try {
      const res = await api.predict({ forecast_days: d });
      setForecast(res);
      if (d === 7) setForecast7(res);
      setForecastError("");
    } catch (e) {
      setForecastError(e.message);
    } finally {
      setRunning(false);
      setLatencyMs(latency.last);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
      setApiOnline(true);
      setBanner(h.model_loaded ? "" : "The API is running but no trained model is loaded yet.");
      if (h.model_loaded) {
        const [hist, m, f7] = await Promise.all([api.history(400), api.metrics(), api.predict({ forecast_days: 7 })]);
        setHistory(hist);
        setMetrics(m);
        setForecast7(f7);
        setLastSync(new Date());
      }
    } catch (e) {
      setApiOnline(false);
      setBanner(`Cannot reach the forecast API (${e.message}).`);
    } finally {
      setLatencyMs(latency.last);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // New model version (e.g. after the Airflow DAG retrains) -> refresh the forecast.
  useEffect(() => {
    if (health?.model_loaded) runForecast(days);
  }, [health?.model_version]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeDays = (d) => {
    setDays(d);
    runForecast(d);
  };

  return (
    <div className="shell">
      <TopBar route={route} theme={theme} onToggleTheme={toggle} apiOnline={apiOnline} health={health} />
      <MarketBar live={live} history={history} forecast={forecast7} />

      <main className="page">
        {banner && <div className="alert">{banner}</div>}

        {route === "terminal" && (
          <TerminalView
            history={history}
            forecast={forecast}
            metrics={metrics}
            live={live}
            theme={theme}
            days={days}
            onDays={changeDays}
            onRun={() => runForecast(days)}
            running={running}
            error={forecastError}
          />
        )}
        {route === "model" && <ModelView metrics={metrics} theme={theme} />}
        {route === "scenario" && <ScenarioView history={history} baseForecast={forecast7} theme={theme} />}
        {route === "api" && <ApiView health={health} latencyMs={latencyMs} />}
      </main>

      <StatusBar apiOnline={apiOnline} health={health} latencyMs={latencyMs} live={live} lastSync={lastSync} />
    </div>
  );
}
