import { useEffect, useState } from "react";
import { fmtDuration } from "../api";

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{now.toISOString().slice(11, 19)} UTC</span>;
}

// IDE-style footer with connection and deployment details.
export default function StatusBar({ apiOnline, health, latencyMs, live, lastSync }) {
  const feedOk = live.source !== "offline" && live.source !== "connecting";
  return (
    <footer className="statusbar">
      <span className="item" style={{ color: apiOnline ? "var(--up)" : "var(--down)" }}>
        <span className="dot" /> {apiOnline ? "Connected" : "Disconnected"}
      </span>
      <span className="item num">{latencyMs != null ? `${latencyMs} ms` : "— ms"}</span>
      <span className="sep" />
      <span className="item hide-sm">
        Pod <span className="num">{health?.pod || "—"}</span>
      </span>
      <span className="item hide-sm">Stage {health?.model_stage || "—"}</span>
      <span className="item hide-sm">Uptime {fmtDuration(health?.uptime_seconds)}</span>
      <span className="sep hide-sm" />
      <span className="item hide-sm" style={{ color: feedOk ? undefined : "var(--down)" }}>
        Feed {live.source}
      </span>
      <span className="item push hide-sm">
        {lastSync ? `Synced ${lastSync.toLocaleTimeString("en-GB")}` : "Syncing…"}
      </span>
      <span className="item">
        <UtcClock />
      </span>
    </footer>
  );
}
