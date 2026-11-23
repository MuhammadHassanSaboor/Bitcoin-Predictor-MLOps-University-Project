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
    text: dark ? "#c9d1e0" : "#1f2937",
    muted: dark ? "#7d879c" : "#6b7280",
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.07)",
    axis: dark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.18)",
    hoverBg: dark ? "#161c2b" : "#ffffff",
    up: "#16c784",
    down: "#ea3943",
    accent: "#f7931a",
    forecast: dark ? "#8b7bff" : "#6d4aff",
    band: dark ? "rgba(139,123,255,0.18)" : "rgba(109,74,255,0.13)",
    ma7: dark ? "#38bdf8" : "#0284c7",
    ma30: dark ? "#f472b6" : "#db2777",
    naive: dark ? "#6b7280" : "#9ca3af",
    volUp: dark ? "rgba(22,199,132,0.35)" : "rgba(22,199,132,0.45)",
    volDown: dark ? "rgba(234,57,67,0.35)" : "rgba(234,57,67,0.45)",
  };
}

export function baseLayout(c, extra = {}) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, system-ui, sans-serif", color: c.text, size: 12 },
    margin: { l: 56, r: 16, t: 10, b: 36 },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: c.hoverBg,
      bordercolor: c.axis,
      font: { color: c.text, family: "JetBrains Mono, monospace", size: 12 },
    },
    showlegend: true,
    legend: { orientation: "h", x: 0, y: 1.08, font: { size: 11, color: c.muted } },
    xaxis: {
      gridcolor: c.grid,
      linecolor: c.axis,
      zeroline: false,
      tickfont: { color: c.muted },
    },
    yaxis: {
      gridcolor: c.grid,
      linecolor: c.axis,
      zeroline: false,
      tickfont: { color: c.muted },
      side: "right",
    },
    ...extra,
  };
}

export const plotConfig = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toggleSpikelines"],
};
