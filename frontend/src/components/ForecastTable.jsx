import { fmtDate, fmtPct, fmtUsd } from "../api";

// Day-by-day forecast with the 80% range drawn as a bar.
export default function ForecastTable({ forecast }) {
  const preds = forecast?.predictions || [];
  if (!preds.length) return <div className="skeleton" style={{ height: 220, margin: 16 }} />;

  const lo = Math.min(...preds.map((p) => p.lower_80));
  const hi = Math.max(...preds.map((p) => p.upper_80));
  const pos = (v) => ((v - lo) / (hi - lo || 1)) * 100;
  let prev = forecast.last_close;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th className="r">Forecast</th>
            <th className="r">Day change</th>
            <th className="r">vs last close</th>
            <th className="r">Low (80%)</th>
            <th className="r">High (80%)</th>
            <th>Range</th>
          </tr>
        </thead>
        <tbody>
          {preds.map((p) => {
            const day = ((p.predicted_close - prev) / prev) * 100;
            prev = p.predicted_close;
            return (
              <tr key={p.date}>
                <td>
                  <span className="badge brand">D+{p.day}</span>
                </td>
                <td>{fmtDate(p.date, { weekday: "short", month: "short", day: "numeric" })}</td>
                <td className="r num" style={{ fontWeight: 600 }}>
                  {fmtUsd(p.predicted_close)}
                </td>
                <td className={`r num ${day >= 0 ? "up" : "down"}`}>{fmtPct(day)}</td>
                <td className={`r num ${p.change_pct >= 0 ? "up" : "down"}`}>{fmtPct(p.change_pct)}</td>
                <td className="r num text-2">{fmtUsd(p.lower_80, 0)}</td>
                <td className="r num text-2">{fmtUsd(p.upper_80, 0)}</td>
                <td>
                  <span className="range-bar" aria-hidden="true">
                    <span className="band" style={{ left: `${pos(p.lower_80)}%`, width: `${pos(p.upper_80) - pos(p.lower_80)}%` }} />
                    <span className="mark" style={{ left: `${pos(p.predicted_close)}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
