"""Step 2 of the pipeline: clean the raw data and build features.

The model only uses features computed from the closing price, so the API can
also forecast from a custom list of closing prices sent by a user.

Indicators added (as required by the assignment):
  * 7-day and 30-day moving averages
  * 7-day and 30-day volatility (std of daily log returns)
  * RSI, momentum and lagged returns

Run:  python src/features.py
"""

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config  # noqa: E402

log = logging.getLogger("features")

LAGS = range(1, 8)
RETURN_WINDOWS = (3, 7, 14, 30)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Sort by date, remove duplicates/bad rows and fill small gaps."""
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").drop_duplicates("Date", keep="last")
    num_cols = ["Open", "High", "Low", "Close", "Volume"]
    df[num_cols] = df[num_cols].apply(pd.to_numeric, errors="coerce")
    df = df[df["Close"] > 0]
    # Make the index a continuous daily calendar and forward-fill missing days.
    df = df.set_index("Date").asfreq("D")
    df[num_cols] = df[num_cols].ffill()
    return df.dropna(subset=["Close"]).reset_index()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / window, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / window, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50)


def build_features(close: pd.Series, dates: pd.Series | None = None) -> pd.DataFrame:
    """Turn a series of closing prices into a table of model features.

    All features are scale-free (returns / ratios), so a model trained when
    BTC was $10k still works when BTC is $100k.
    """
    close = pd.Series(np.asarray(close, dtype=float))
    log_close = np.log(close)
    daily_ret = log_close.diff()

    feats = pd.DataFrame(index=close.index)
    for lag in LAGS:
        feats[f"ret_lag_{lag}"] = daily_ret.shift(lag - 1)
    for w in RETURN_WINDOWS:
        feats[f"ret_{w}d"] = log_close - log_close.shift(w)

    ma7 = close.rolling(7).mean()
    ma30 = close.rolling(30).mean()
    feats["ma7_gap"] = close / ma7 - 1
    feats["ma30_gap"] = close / ma30 - 1
    feats["ma7_vs_ma30"] = ma7 / ma30 - 1
    feats["vol_7d"] = daily_ret.rolling(7).std()
    feats["vol_30d"] = daily_ret.rolling(30).std()
    feats["vol_ratio"] = feats["vol_7d"] / feats["vol_30d"]
    feats["rsi_14"] = rsi(close, 14) / 100
    feats["range_30d"] = (close - close.rolling(30).min()) / (
        close.rolling(30).max() - close.rolling(30).min()
    )

    if dates is not None:
        dow = pd.to_datetime(pd.Series(np.asarray(dates))).dt.dayofweek
        feats["dow_sin"] = np.sin(2 * np.pi * dow / 7)
        feats["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    else:
        feats["dow_sin"] = 0.0
        feats["dow_cos"] = 1.0
    return feats


def build_targets(close: pd.Series, horizon: int = config.HORIZON) -> pd.DataFrame:
    """Target for day h = log(close[t+h] / close[t]) for h = 1..horizon."""
    log_close = np.log(pd.Series(np.asarray(close, dtype=float)))
    return pd.DataFrame(
        {f"target_h{h}": log_close.shift(-h) - log_close for h in range(1, horizon + 1)}
    )


def add_indicator_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Human-readable indicators kept in the processed CSV (used by the dashboard)."""
    df = df.copy()
    df["MA_7"] = df["Close"].rolling(7).mean()
    df["MA_30"] = df["Close"].rolling(30).mean()
    df["Volatility_7"] = np.log(df["Close"]).diff().rolling(7).std()
    df["Volatility_30"] = np.log(df["Close"]).diff().rolling(30).std()
    return df


def build_dataset(raw: pd.DataFrame) -> pd.DataFrame:
    df = add_indicator_columns(clean(raw))
    feats = build_features(df["Close"], df["Date"])
    targets = build_targets(df["Close"])
    out = pd.concat([df.reset_index(drop=True), feats, targets], axis=1)
    # Drop warm-up rows where the 30-day windows are not ready yet.
    return out.iloc[config.MIN_HISTORY :].reset_index(drop=True)


def feature_names() -> list[str]:
    demo = build_features(pd.Series(np.linspace(1, 2, 80)), pd.date_range("2020-01-01", periods=80))
    return list(demo.columns)


def main() -> dict:
    raw = pd.read_csv(config.RAW_DATA_PATH, parse_dates=["Date"])
    data = build_dataset(raw)
    config.PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(config.PROCESSED_DATA_PATH, index=False)
    log.info(
        "Saved %d rows x %d cols to %s", *data.shape, config.short_path(config.PROCESSED_DATA_PATH)
    )
    return {
        "rows": len(data),
        "features": len(feature_names()),
        "path": config.short_path(config.PROCESSED_DATA_PATH),
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    print(main())
