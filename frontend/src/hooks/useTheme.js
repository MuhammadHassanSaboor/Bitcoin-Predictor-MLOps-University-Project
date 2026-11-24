import { useEffect, useState } from "react";

const KEY = "btc-ui-theme";

function initialTheme() {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (fromUrl === "light" || fromUrl === "dark") return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

// Colours used inside Plotly charts (Plotly can't read CSS variables).
export function chartColors(theme) {
  const dark = theme === "dark";
  return {
    dark,
    text: dark ? "#e8ecf3" : "#0e1726",
    text2: dark ? "#a7b0c0" : "#475569",
    muted: dark ? "#6c778a" : "#8592a6",
    grid: dark ? "rgba(255,255,255,0.045)" : "rgba(14,23,38,0.06)",
    axis: dark ? "#222a37" : "#e2e7ee",
    surface: dark ? "#10141b" : "#ffffff",
    hoverBg: dark ? "#1b212c" : "#ffffff",
    up: dark ? "#18c47c" : "#0f9f62",
    down: dark ? "#f0464f" : "#d92d3a",
    brand: dark ? "#f7931a" : "#e8820c",
    forecast: dark ? "#7c8cff" : "#5b5bd6",
    band: dark ? "rgba(124,140,255,0.16)" : "rgba(91,91,214,0.12)",
    zone: dark ? "rgba(124,140,255,0.05)" : "rgba(91,91,214,0.04)",
    ma7: dark ? "#38bdf8" : "#0284c7",
    ma30: dark ? "#e879f9" : "#c026d3",
    naive: dark ? "#6c778a" : "#94a3b8",
    volUp: dark ? "rgba(24,196,124,0.32)" : "rgba(15,159,98,0.35)",
    volDown: dark ? "rgba(240,70,79,0.32)" : "rgba(217,45,58,0.3)",
  };
}

export function baseLayout(c, extra = {}) {
  const axis = {
    gridcolor: c.grid,
    linecolor: c.axis,
    zeroline: false,
    tickfont: { color: c.muted, size: 11, family: "JetBrains Mono, monospace" },
    showline: false,
  };
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, system-ui, sans-serif", color: c.text2, size: 12 },
    margin: { l: 12, r: 64, t: 12, b: 32 },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: c.hoverBg,
      bordercolor: c.axis,
      font: { color: c.text, family: "JetBrains Mono, monospace", size: 11.5 },
    },
    showlegend: false,
    legend: { orientation: "h", x: 0, y: 1.1, font: { size: 11, color: c.muted } },
    xaxis: { ...axis },
    yaxis: { ...axis, side: "right" },
    ...extra,
  };
}

export const plotConfig = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toggleSpikelines", "zoomIn2d", "zoomOut2d"],
};
