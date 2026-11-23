import { useEffect, useState } from "react";
import { fmtPct, fmtUsd } from "../api";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="clock mono">
      {now.toLocaleTimeString("en-GB", { timeZone: "UTC" })} <small>UTC</small>
    </span>
  );
}

export default function Navbar({ live, health, apiOnline, theme, onToggleTheme }) {
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!live.direction) return;
    setFlash(live.direction > 0 ? "flash-up" : "flash-down");
    const id = setTimeout(() => setFlash(""), 600);
    return () => clearTimeout(id);
  }, [live.price, live.direction]);

  const changeCls = live.changePct >= 0 ? "up" : "down";

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="logo" aria-hidden="true">
          ₿
        </div>
        <div className="brand">
          <span className="brand-title">BTC Forecast</span>
          <span className="brand-sub">ML price terminal</span>
        </div>
      </div>

      <div className="nav-center">
        <div className="pair">
          <span className="pair-name">BTC / USD</span>
          <span className={`live-dot ${live.price ? "on" : ""}`} title={`Source: ${live.source}`} />
        </div>
        <span className={`nav-price mono ${flash}`}>{fmtUsd(live.price)}</span>
        <span className={`chip ${changeCls}`}>
          {live.changePct >= 0 ? "▲" : "▼"} {fmtPct(live.changePct)}
        </span>
      </div>

      <div className="nav-right">
        <Clock />
        <span className={`status-pill ${apiOnline ? "ok" : "bad"}`}>
          <span className="dot" /> API {apiOnline ? "online" : "offline"}
        </span>
        {health?.model_version && (
          <span className="badge mono" title={health.model_name}>
            {health.model_version}
          </span>
        )}
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
