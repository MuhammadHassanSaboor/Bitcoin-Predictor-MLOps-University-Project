import BacktestChart from "../components/BacktestChart";
import Leaderboard from "../components/Leaderboard";
import { fmtDate, fmtDateTime, fmtNum, fmtUsd } from "../api";

function Kpi({ label, value, foot, tone }) {
  return (
    <div className="kpi">
      <span className="label-sm">{label}</span>
      <span className={`value num ${tone || ""}`}>{value}</span>
      <span className="foot">{foot}</span>
    </div>
  );
}

function Delta({ model, naive, lowerIsBetter = true }) {
  if (model == null || naive == null) return null;
  const better = lowerIsBetter ? model < naive : model > naive;
  const pct = Math.abs(((model - naive) / naive) * 100);
  return <span className={`badge ${better ? "up" : "down"} num`}>{`${better ? "−" : "+"}${pct.toFixed(1)}% vs naive`}</span>;
}

export default function ModelView({ metrics, theme }) {
  if (!metrics) {
    return (
      <div className="kpis">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="kpi skeleton" style={{ height: 86 }} />
        ))}
      </div>
    );
  }
  const nb = metrics.baseline_naive || {};
  const tw = metrics.test_window;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Model performance</h1>
          <p>
            Latest validation run · held-out window {fmtDate(tw?.dates?.[0])} – {fmtDate(tw?.dates?.at(-1), { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <span className={`badge ${metrics.threshold?.passed ? "up" : "down"}`}>
          {metrics.threshold?.passed ? "Registered" : "Rejected"} · MAPE threshold {metrics.threshold?.mape_max}%
        </span>
      </div>

      <section className="kpis">
        <Kpi label="MAE" value={fmtUsd(metrics.mae, 0)} foot={<Delta model={metrics.mae} naive={nb.mae} />} />
        <Kpi label="RMSE" value={fmtUsd(metrics.rmse, 0)} foot={<Delta model={metrics.rmse} naive={nb.rmse} />} />
        <Kpi label="MAPE" value={`${fmtNum(metrics.mape)}%`} foot={<Delta model={metrics.mape} naive={nb.mape} />} />
        <Kpi
          label="CV MAPE"
          value={`${fmtNum(metrics.cv?.mape, 3)}%`}
          foot={<Delta model={metrics.cv?.mape} naive={metrics.cv?.naive_mape} />}
        />
        <Kpi label="Direction hit-rate" value={`${fmtNum(metrics.direction_accuracy, 0)}%`} foot="up/down calls on 7 test days" />
        <Kpi label="Training rows" value={metrics.training_rows?.toLocaleString("en-US")} foot={`daily data to ${metrics.data_last_date}`} />
      </section>

      <div className="grid-model">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <h2>Model card</h2>
              <p>What is deployed right now</p>
            </div>
            <span className="badge brand num">{metrics.model_version}</span>
          </div>
          <div className="panel-body">
            <dl className="kv">
              <dt>Model</dt>
              <dd>{metrics.model_name}</dd>
              <dt>Trained</dt>
              <dd className="num">{fmtDateTime(metrics.trained_at)}</dd>
              <dt>Strategy</dt>
              <dd>Direct 7-horizon</dd>
              <dt>Target</dt>
              <dd>log return, day +1…+7</dd>
              <dt>Features</dt>
              <dd>21 price-based</dd>
              <dt>Validation</dt>
              <dd>Walk-forward CV</dd>
              <dt>Folds</dt>
              <dd className="num">6 × 60 days, 7-day gap</dd>
              <dt>Interval</dt>
              <dd>80% from CV residuals</dd>
              <dt>Data source</dt>
              <dd>Yahoo Finance (BTC-USD)</dd>
              <dt>Retraining</dt>
              <dd>Daily (Airflow)</dd>
            </dl>
          </div>
        </section>

        <div className="grid-2">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <h2>Backtest</h2>
                <p>Actual vs model vs naive on the last 7 held-out days</p>
              </div>
            </div>
            <div className="panel-body flush">
              <BacktestChart metrics={metrics} theme={theme} height={300} />
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <h2>Model leaderboard</h2>
                <p>Walk-forward CV MAPE · green = deployed · grey = naive</p>
              </div>
            </div>
            <div className="panel-body flush">
              <Leaderboard metrics={metrics} theme={theme} height={300} />
            </div>
          </section>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <h2>Test window detail</h2>
            <p>Forecast made on {tw?.origin_date} (close {fmtUsd(tw?.origin_close, 0)})</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="r">Actual</th>
                <th className="r">Model</th>
                <th className="r">Model error</th>
                <th className="r">Naive</th>
                <th className="r">Naive error</th>
              </tr>
            </thead>
            <tbody>
              {tw?.dates.map((d, i) => {
                const a = tw.actual[i];
                const me = ((tw.predicted[i] - a) / a) * 100;
                const ne = ((tw.naive[i] - a) / a) * 100;
                return (
                  <tr key={d}>
                    <td>{fmtDate(d, { weekday: "short", month: "short", day: "numeric" })}</td>
                    <td className="r num">{fmtUsd(a, 0)}</td>
                    <td className="r num">{fmtUsd(tw.predicted[i], 0)}</td>
                    <td className={`r num ${Math.abs(me) <= Math.abs(ne) ? "up" : "text-2"}`}>{`${me >= 0 ? "+" : ""}${me.toFixed(2)}%`}</td>
                    <td className="r num text-2">{fmtUsd(tw.naive[i], 0)}</td>
                    <td className="r num text-2">{`${ne >= 0 ? "+" : ""}${ne.toFixed(2)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
