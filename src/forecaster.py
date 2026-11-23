"""Model zoo + forecasting logic shared by training (src/train_forecast.py)
and serving (app/app.py).

Strategy: "direct multi-horizon" forecasting. One model predicts 7 outputs at
once: the log-return from today to day +1, +2, ... +7. Price for day h is
    last_close * exp(predicted_log_return_h)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from src import config
from src.features import build_features

RANDOM_STATE = 42

MODEL_FAMILIES = ("ridge", "random_forest", "extra_trees", "xgboost", "lightgbm")

DISPLAY_NAMES = {
    "naive": "Naive (last price)",
    "ridge": "Ridge Regression",
    "random_forest": "Random Forest",
    "extra_trees": "Extra Trees",
    "xgboost": "XGBoost",
    "lightgbm": "LightGBM",
}


def make_model(family: str, params: dict):
    """Create an un-fitted estimator that predicts all horizons at once."""
    params = {k: v for k, v in params.items() if k != "train_window"}
    if family == "ridge":
        return make_pipeline(StandardScaler(), Ridge(**params))
    if family == "random_forest":
        return RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1, **params)
    if family == "extra_trees":
        return ExtraTreesRegressor(random_state=RANDOM_STATE, n_jobs=-1, **params)
    if family == "xgboost":
        return XGBRegressor(
            tree_method="hist", random_state=RANDOM_STATE, n_jobs=-1, verbosity=0, **params
        )
    if family == "lightgbm":
        return MultiOutputRegressor(
            LGBMRegressor(random_state=RANDOM_STATE, n_jobs=-1, verbose=-1, **params)
        )
    raise ValueError(f"Unknown model family: {family}")


class AveragingEnsemble:
    """Average of several fitted models (used when it beats every single model)."""

    def __init__(self, models: list, names: list[str]):
        self.models = models
        self.names = names

    def predict(self, X):
        return np.mean([m.predict(X) for m in self.models], axis=0)


def forecast(
    bundle: dict,
    closes: list[float] | np.ndarray | None = None,
    last_date: str | pd.Timestamp | None = None,
    days: int = config.HORIZON,
) -> list[dict]:
    """Forecast the next `days` closing prices.

    If `closes` is None the history stored inside the model bundle is used.
    """
    if closes is None:
        hist = bundle["history"]
        closes = np.asarray(hist["close"], dtype=float)
        last_date = pd.Timestamp(hist["dates"][-1])
    else:
        closes = np.asarray(closes, dtype=float)
        last_date = (
            pd.Timestamp(last_date)
            if last_date is not None
            else pd.Timestamp(bundle["history"]["dates"][-1])
        )

    dates = pd.date_range(end=last_date, periods=len(closes), freq="D")
    feats = build_features(pd.Series(closes), pd.Series(dates))
    x_last = feats[bundle["feature_names"]].iloc[[-1]]
    if x_last.isna().any(axis=None):
        raise ValueError("Not enough clean history to build features")

    log_ret = np.asarray(bundle["model"].predict(x_last.values)).reshape(-1)
    last_close = float(closes[-1])
    q_low = np.asarray(bundle["interval"]["lower"])
    q_high = np.asarray(bundle["interval"]["upper"])

    out = []
    for h in range(1, days + 1):
        r = log_ret[h - 1]
        out.append(
            {
                "day": h,
                "date": (last_date + pd.Timedelta(days=h)).strftime("%Y-%m-%d"),
                "predicted_close": round(last_close * float(np.exp(r)), 2),
                "lower_80": round(last_close * float(np.exp(r + q_low[h - 1])), 2),
                "upper_80": round(last_close * float(np.exp(r + q_high[h - 1])), 2),
                "change_pct": round((float(np.exp(r)) - 1) * 100, 3),
            }
        )
    return out
