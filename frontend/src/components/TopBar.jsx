import { IconBitcoin, IconChart, IconCode, IconFlask, IconModel, IconMoon, IconSun } from "./Icons";

const LINKS = [
  { route: "terminal", href: "#/", label: "Terminal", Icon: IconChart },
  { route: "model", href: "#/model", label: "Model", Icon: IconModel },
  { route: "scenario", href: "#/scenario", label: "Scenario Lab", Icon: IconFlask },
  { route: "api", href: "#/api", label: "API", Icon: IconCode },
];

export default function TopBar({ route, theme, onToggleTheme, apiOnline, health }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="topbar">
      <a className="brand" href="#/" aria-label="BTC Forecast home" style={{ textDecoration: "none" }}>
        <span className="brand-mark">
          <IconBitcoin width={16} height={16} />
        </span>
        <span className="brand-name">BTC Forecast</span>
        <span className="brand-tag">ML</span>
      </a>

      <nav className="nav" aria-label="Main">
        {LINKS.map(({ route: r, href, label, Icon }) => (
          <a key={r} href={href} className={route === r ? "active" : ""} aria-current={route === r ? "page" : undefined}>
            <Icon />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="topbar-right">
        {health?.model_version && (
          <span className="pill hide-sm num" title={health.model_name}>
            {health.model_version}
          </span>
        )}
        <span className={`pill ${apiOnline ? "ok" : "bad"}`}>
          <span className={`dot ${apiOnline ? "live" : ""}`} />
          {apiOnline ? "API online" : "API offline"}
        </span>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${next} theme`}
          title={`Switch to ${next} theme`}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
