"""Unit tests for feature engineering and training helpers."""

import numpy as np
import pandas as pd

from src import config
from src.features import build_dataset, build_features, build_targets, clean, feature_names
from src.train_forecast import H, price_metrics, return_mape, walk_forward_splits


def test_clean_fills_missing_days_and_sorts(raw_prices):
    messy = pd.concat([raw_prices.iloc[[5, 3]], raw_prices.iloc[10:20], raw_prices.iloc[[12]]])
    out = clean(messy)
    assert out["Date"].is_monotonic_increasing
    assert out["Date"].is_unique
    assert out["Close"].notna().all()
    # Calendar is continuous from first to last date
    assert len(out) == (out["Date"].max() - out["Date"].min()).days + 1


def test_features_are_scale_free(raw_prices):
    f1 = build_features(raw_prices["Close"], raw_prices["Date"]).dropna()
    f2 = build_features(raw_prices["Close"] * 10, raw_prices["Date"]).dropna()
    pd.testing.assert_frame_equal(f1, f2, check_exact=False, atol=1e-9)


def test_feature_names_match_builder(raw_prices):
    feats = build_features(raw_prices["Close"], raw_prices["Date"])
    assert list(feats.columns) == feature_names()


def test_targets_are_future_log_returns():
    close = pd.Series([100.0, 110.0, 121.0, 133.1, 146.41, 161.05, 177.16, 194.87, 214.36])
    t = build_targets(close, horizon=7)
    assert np.isclose(t.loc[0, "target_h1"], np.log(1.1))
    assert np.isclose(t.loc[0, "target_h7"], np.log(close[7] / close[0]))
    assert t["target_h7"].iloc[-1:].isna().all()


def test_dataset_has_indicators(raw_prices):
    data = build_dataset(raw_prices)
    for col in ("MA_7", "MA_30", "Volatility_7", "Volatility_30", "target_h1", "target_h7"):
        assert col in data.columns
    assert len(data) == len(raw_prices) - config.MIN_HISTORY


def test_price_metrics():
    m = price_metrics(np.array([100.0, 200.0]), np.array([110.0, 180.0]))
    assert m["mae"] == 15.0
    assert m["mape"] == 10.0
    assert np.isclose(m["rmse"], np.sqrt((100 + 400) / 2), atol=0.01)


def test_return_mape_zero_when_perfect():
    y = np.random.default_rng(0).normal(0, 0.02, (50, 7))
    assert return_mape(y, y) == 0


def test_walk_forward_splits_have_no_leakage():
    splits = walk_forward_splits(1500)
    assert len(splits) == 6
    for train_idx, test_idx in splits:
        assert train_idx.max() + H < test_idx.min()
    assert splits[-1][1].max() == 1499
