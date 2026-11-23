"""Step 1 of the pipeline: download daily BTC-USD prices and save them as raw CSV.

Source order:
  1. yfinance (Yahoo Finance)
  2. Binance public API (fallback if Yahoo is down)

Run:  python src/etl_fetch.py
"""

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config  # noqa: E402

log = logging.getLogger("etl_fetch")

COLUMNS = ["Date", "Open", "High", "Low", "Close", "Volume"]


def fetch_from_yfinance(
    ticker: str = config.TICKER, start: str = config.START_DATE
) -> pd.DataFrame:
    import yfinance as yf

    df = yf.download(ticker, start=start, interval="1d", progress=False, auto_adjust=False)
    if df is None or df.empty:
        raise RuntimeError("yfinance returned no data")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"]).dt.tz_localize(None).dt.normalize()
    return df[COLUMNS]


def fetch_from_binance(start: str = config.START_DATE) -> pd.DataFrame:
    url = "https://api.binance.com/api/v3/klines"
    start_ms = int(pd.Timestamp(start, tz="UTC").timestamp() * 1000)
    rows = []
    while True:
        params = {"symbol": "BTCUSDT", "interval": "1d", "startTime": start_ms, "limit": 1000}
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        start_ms = batch[-1][0] + 24 * 60 * 60 * 1000
        if len(batch) < 1000:
            break
    if not rows:
        raise RuntimeError("Binance returned no data")
    df = pd.DataFrame(rows).iloc[:, :6]
    df.columns = COLUMNS
    df["Date"] = pd.to_datetime(df["Date"], unit="ms").dt.normalize()
    df[COLUMNS[1:]] = df[COLUMNS[1:]].astype(float)
    return df


def drop_incomplete_today(df: pd.DataFrame) -> pd.DataFrame:
    """The row for today (UTC) is still moving, so it is not a real daily close."""
    today = pd.Timestamp(datetime.now(timezone.utc).date())
    return df[df["Date"] < today]


def fetch_btc_data() -> pd.DataFrame:
    try:
        df = fetch_from_yfinance()
        source = "yfinance"
    except Exception as exc:  # network / API problems
        log.warning("yfinance failed (%s), trying Binance", exc)
        df = fetch_from_binance()
        source = "binance"
    df = drop_incomplete_today(df)
    df = df.dropna(subset=["Close"]).sort_values("Date").drop_duplicates("Date")
    log.info(
        "Fetched %d rows from %s (%s -> %s)",
        len(df),
        source,
        df["Date"].min().date(),
        df["Date"].max().date(),
    )
    return df.reset_index(drop=True)


def save_raw(df: pd.DataFrame, path: Path = config.RAW_DATA_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    log.info("Saved raw data to %s", config.short_path(path))
    return path


def main() -> dict:
    df = fetch_btc_data()
    path = save_raw(df)
    return {
        "rows": len(df),
        "first_date": str(df["Date"].min().date()),
        "last_date": str(df["Date"].max().date()),
        "last_close": round(float(df["Close"].iloc[-1]), 2),
        "path": config.short_path(path),
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    print(main())
