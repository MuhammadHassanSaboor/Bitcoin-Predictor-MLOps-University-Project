"""Step 3 of the pipeline: train the 7-day BTC forecasting model.

What happens:
  1. Hold out the latest 7 days as the final test window.
  2. Model selection with walk-forward (time-series) cross-validation:
     random search over Ridge, Random Forest, Extra Trees, XGBoost, LightGBM
     + averaging ensembles of the best families.
  3. Evaluate the winner on the 7-day test window (MAE, RMSE, MAPE) and compare
     with a naive "price stays the same" baseline.
  4. Refit the winner on all data.
  5. Register (save) the model only if test MAPE < MAPE_THRESHOLD.

Run:
  python src/train_forecast.py            # tune if no saved params, else reuse
  python src/train_forecast.py --tune     # force a full hyper-parameter search
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import ParameterSampler

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config  # noqa: E402
from src.features import build_dataset, feature_names  # noqa: E402
from src.forecaster import (  # noqa: E402
    DISPLAY_NAMES,
    MODEL_FAMILIES,
    RANDOM_STATE,
    AveragingEnsemble,
    make_model,
)

log = logging.getLogger("train_forecast")

H = config.HORIZON
TARGETS = [f"target_h{h}" for h in range(1, H + 1)]

# Walk-forward CV settings
CV_FOLDS = 6
CV_TEST_SIZE = 60  # days per validation fold
TRAIN_WINDOWS = [730, 1460, None]  # last 2y, last 4y, all history

SEARCH_SPACE = {
    "ridge": {"alpha": [0.1, 1, 10, 30, 100, 300, 1000, 3000], "train_window": TRAIN_WINDOWS},
    "random_forest": {
        "n_estimators": [300],
        "max_depth": [3, 5, 8, None],
        "min_samples_leaf": [10, 20, 50, 100],
        "max_features": [0.3, 0.5, 0.8],
        "train_window": TRAIN_WINDOWS,
    },
    "extra_trees": {
        "n_estimators": [300],
        "max_depth": [3, 5, 8, None],
        "min_samples_leaf": [10, 20, 50, 100],
        "max_features": [0.3, 0.5, 0.8],
        "train_window": TRAIN_WINDOWS,
    },
    "xgboost": {
        "n_estimators": [150, 300, 600],
        "learning_rate": [0.01, 0.03, 0.05],
        "max_depth": [2, 3, 4],
        "subsample": [0.6, 0.8, 1.0],
        "colsample_bytree": [0.5, 0.8, 1.0],
        "min_child_weight": [5, 20, 50],
        "reg_lambda": [1, 10, 50],
        "objective": ["reg:squarederror", "reg:absoluteerror"],
        "train_window": TRAIN_WINDOWS,
    },
    "lightgbm": {
        "n_estimators": [150, 300, 600],
        "learning_rate": [0.01, 0.03, 0.05],
        "num_leaves": [4, 8, 16],
        "min_child_samples": [30, 60, 120],
        "subsample": [0.7, 0.9],
        "subsample_freq": [1],
        "colsample_bytree": [0.5, 0.8, 1.0],
        "reg_lambda": [0, 5, 20],
        "objective": ["regression", "l1"],
        "train_window": TRAIN_WINDOWS,
    },
}
N_ITER = {"ridge": 12, "random_forest": 8, "extra_trees": 8, "xgboost": 16, "lightgbm": 16}


# ----------------------------------------------------------------------------- metrics
def price_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    actual, predicted = np.asarray(actual, float), np.asarray(predicted, float)
    err = predicted - actual
    return {
        "mae": round(float(np.mean(np.abs(err))), 2),
        "rmse": round(float(np.sqrt(np.mean(err**2))), 2),
        "mape": round(float(np.mean(np.abs(err) / actual) * 100), 3),
    }


def return_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Price-space MAPE (%) computed from log-return targets."""
    return float(np.mean(np.abs(np.exp(y_pred - y_true) - 1)) * 100)


# ----------------------------------------------------------------------------- CV
def walk_forward_splits(n_rows: int):
    """Expanding-window folds with a 7-day purge gap (targets look 7 days ahead)."""
    splits = []
    for k in range(CV_FOLDS, 0, -1):
        test_end = n_rows - (k - 1) * CV_TEST_SIZE
        test_start = test_end - CV_TEST_SIZE
        train_end = test_start - H
        splits.append((np.arange(0, train_end), np.arange(test_start, test_end)))
    return splits


def window(idx: np.ndarray, train_window: int | None) -> np.ndarray:
    return idx if train_window is None else idx[-train_window:]


def cv_evaluate(family: str, params: dict, X: np.ndarray, Y: np.ndarray, splits) -> tuple:
    oof = np.full_like(Y, np.nan)
    for tr, te in splits:
        tr = window(tr, params.get("train_window"))
        model = make_model(family, params)
        model.fit(X[tr], Y[tr])
        oof[te] = np.asarray(model.predict(X[te])).reshape(len(te), H)
    mask = ~np.isnan(oof[:, 0])
    return return_mape(Y[mask], oof[mask]), oof


def search(X: np.ndarray, Y: np.ndarray, families: dict[str, list[dict]]) -> list[dict]:
    """Evaluate every candidate config, return the leaderboard (best first)."""
    splits = walk_forward_splits(len(X))
    mask = np.zeros(len(X), bool)
    for _, te in splits:
        mask[te] = True

    results = []
    naive = np.zeros_like(Y)
    results.append(
        {
            "family": "naive",
            "params": {},
            "cv_mape": return_mape(Y[mask], naive[mask]),
            "oof": naive,
        }
    )

    for family, configs in families.items():
        best = None
        for params in configs:
            t0 = time.time()
            score, oof = cv_evaluate(family, params, X, Y, splits)
            log.info("%-14s %-90s CV MAPE %.3f%% (%.1fs)", family, params, score, time.time() - t0)
            if best is None or score < best["cv_mape"]:
                best = {"family": family, "params": params, "cv_mape": score, "oof": oof}
        results.append(best)

    # Averaging ensembles of the best 2 / 3 model families.
    singles = sorted([r for r in results if r["family"] != "naive"], key=lambda r: r["cv_mape"])
    for k in (2, 3):
        if len(singles) >= k:
            members = singles[:k]
            oof = np.mean([m["oof"] for m in members], axis=0)
            results.append(
                {
                    "family": f"ensemble_top{k}",
                    "params": {
                        "members": [{"family": m["family"], "params": m["params"]} for m in members]
                    },
                    "cv_mape": return_mape(Y[mask], oof[mask]),
                    "oof": oof,
                }
            )

    for r in results:
        r["cv_mape"] = round(r["cv_mape"], 4)
    return sorted(results, key=lambda r: r["cv_mape"]), mask


def sample_configs(tune: bool) -> dict[str, list[dict]]:
    if not tune and config.BEST_PARAMS_PATH.exists():
        saved = json.loads(config.BEST_PARAMS_PATH.read_text())
        log.info("Re-using saved best params from %s", config.BEST_PARAMS_PATH)
        return {fam: [params] for fam, params in saved.items() if fam in MODEL_FAMILIES}
    return {
        fam: list(
            ParameterSampler(SEARCH_SPACE[fam], n_iter=N_ITER[fam], random_state=RANDOM_STATE)
        )
        for fam in MODEL_FAMILIES
    }


# ----------------------------------------------------------------------------- fit helpers
def fit_candidate(candidate: dict, X: np.ndarray, Y: np.ndarray):
    """Fit the chosen candidate (single model or ensemble) on X, Y."""
    if candidate["family"].startswith("ensemble"):
        models, names = [], []
        for m in candidate["params"]["members"]:
            idx = window(np.arange(len(X)), m["params"].get("train_window"))
            est = make_model(m["family"], m["params"]).fit(X[idx], Y[idx])
            models.append(est)
            names.append(DISPLAY_NAMES[m["family"]])
        model = AveragingEnsemble(models, names)
    else:
        idx = window(np.arange(len(X)), candidate["params"].get("train_window"))
        model = make_model(candidate["family"], candidate["params"]).fit(X[idx], Y[idx])
    return model


def display_name(candidate: dict) -> str:
    fam = candidate["family"]
    if fam.startswith("ensemble"):
        members = " + ".join(DISPLAY_NAMES[m["family"]] for m in candidate["params"]["members"])
        return f"Ensemble ({members})"
    return DISPLAY_NAMES[fam]


# ----------------------------------------------------------------------------- main
def load_data() -> pd.DataFrame:
    if config.PROCESSED_DATA_PATH.exists():
        return pd.read_csv(config.PROCESSED_DATA_PATH, parse_dates=["Date"])
    raw = pd.read_csv(config.RAW_DATA_PATH, parse_dates=["Date"])
    return build_dataset(raw)


def train(df: pd.DataFrame, tune: bool = False, register: bool = True) -> dict:
    feats = feature_names()
    df = df.dropna(subset=feats).reset_index(drop=True)
    n = len(df)
    origin = n - 1 - H  # forecast origin of the final 7-day test window
    if origin < CV_FOLDS * CV_TEST_SIZE + 200:
        raise ValueError(f"Not enough data to train ({n} rows)")

    X_all = df[feats].to_numpy(float)
    Y_all = df[TARGETS].to_numpy(float)

    # Rows whose 7-day targets end on or before the origin -> no leakage.
    dev_idx = np.arange(0, origin - H + 1)
    X_dev, Y_dev = X_all[dev_idx], Y_all[dev_idx]

    # 1) model selection
    t0 = time.time()
    leaderboard, cv_mask = search(X_dev, Y_dev, sample_configs(tune))
    best = next(r for r in leaderboard if r["family"] != "naive")
    log.info(
        "Best candidate: %s (CV MAPE %.3f%%) in %.0fs",
        display_name(best),
        best["cv_mape"],
        time.time() - t0,
    )

    # Prediction interval (80%) from out-of-fold residuals per horizon.
    resid = Y_dev[cv_mask] - best["oof"][cv_mask]
    interval = {
        "lower": np.quantile(resid, 0.10, axis=0).round(5).tolist(),
        "upper": np.quantile(resid, 0.90, axis=0).round(5).tolist(),
    }

    # 2) evaluate on the latest 7-day test window
    test_model = fit_candidate(best, X_dev, Y_dev)
    origin_close = float(df["Close"].iloc[origin])
    pred_ret = np.asarray(test_model.predict(X_all[[origin]])).reshape(-1)
    predicted = origin_close * np.exp(pred_ret)
    actual = df["Close"].iloc[origin + 1 : origin + 1 + H].to_numpy(float)
    naive = np.full(H, origin_close)
    test_metrics = price_metrics(actual, predicted)
    naive_metrics = price_metrics(actual, naive)
    test_metrics["direction_accuracy"] = round(
        float(np.mean(np.sign(predicted - origin_close) == np.sign(actual - origin_close)) * 100), 1
    )

    # 3) refit on all rows that have complete targets
    full_idx = np.arange(0, n - H)
    final_model = fit_candidate(best, X_all[full_idx], Y_all[full_idx])

    now = datetime.now(timezone.utc)
    version = now.strftime("v%Y%m%d-%H%M")
    passed = test_metrics["mape"] < config.MAPE_THRESHOLD

    tail = df.tail(400)
    bundle = {
        "model": final_model,
        "model_name": display_name(best),
        "family": best["family"],
        "params": best["params"],
        "feature_names": feats,
        "horizon": H,
        "interval": interval,
        "version": version,
        "trained_at": now.isoformat(timespec="seconds"),
        "history": {
            "dates": tail["Date"].dt.strftime("%Y-%m-%d").tolist(),
            "open": tail["Open"].round(2).tolist(),
            "high": tail["High"].round(2).tolist(),
            "low": tail["Low"].round(2).tolist(),
            "close": tail["Close"].round(2).tolist(),
            "volume": tail["Volume"].round(0).tolist(),
        },
    }

    metrics = {
        "model_version": version,
        "model_name": display_name(best),
        "trained_at": bundle["trained_at"],
        "data_last_date": bundle["history"]["dates"][-1],
        "training_rows": int(len(full_idx)),
        "mae": test_metrics["mae"],
        "rmse": test_metrics["rmse"],
        "mape": test_metrics["mape"],
        "direction_accuracy": test_metrics["direction_accuracy"],
        "test_window": {
            "origin_date": df["Date"].iloc[origin].strftime("%Y-%m-%d"),
            "origin_close": round(origin_close, 2),
            "dates": df["Date"].iloc[origin + 1 : origin + 1 + H].dt.strftime("%Y-%m-%d").tolist(),
            "actual": actual.round(2).tolist(),
            "predicted": predicted.round(2).tolist(),
            "naive": naive.round(2).tolist(),
        },
        "baseline_naive": naive_metrics,
        "cv": {
            "method": f"walk-forward, {CV_FOLDS} folds x {CV_TEST_SIZE} days, {H}-day purge gap",
            "mape": best["cv_mape"],
            "naive_mape": next(r["cv_mape"] for r in leaderboard if r["family"] == "naive"),
        },
        "leaderboard": [
            {
                "model": display_name(r),
                "family": r["family"],
                "cv_mape": r["cv_mape"],
                "params": r["params"],
            }
            for r in leaderboard
        ],
        "threshold": {"mape_max": config.MAPE_THRESHOLD, "passed": bool(passed)},
        "registered": bool(passed and register),
    }

    if register:
        config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        _save_best_params(leaderboard)
        if passed:
            joblib.dump(bundle, config.MODEL_PATH, compress=3)
            config.METRICS_PATH.write_text(json.dumps(metrics, indent=2))
            config.VERSION_PATH.write_text(version + "\n")
            log.info(
                "Model %s REGISTERED (test MAPE %.3f%% < %.1f%%)",
                version,
                metrics["mape"],
                config.MAPE_THRESHOLD,
            )
        else:
            (config.MODEL_DIR / "rejected_metrics.json").write_text(json.dumps(metrics, indent=2))
            log.warning(
                "Model %s REJECTED (test MAPE %.3f%% >= %.1f%%); keeping previous model",
                version,
                metrics["mape"],
                config.MAPE_THRESHOLD,
            )
        _append_registry(metrics)

    return {"bundle": bundle, "metrics": metrics}


def _save_best_params(leaderboard: list[dict]) -> None:
    best = {r["family"]: r["params"] for r in leaderboard if r["family"] in MODEL_FAMILIES}
    config.BEST_PARAMS_PATH.write_text(json.dumps(best, indent=2))


def _append_registry(metrics: dict) -> None:
    registry = []
    if config.REGISTRY_PATH.exists():
        registry = json.loads(config.REGISTRY_PATH.read_text())
    registry.append(
        {
            "version": metrics["model_version"],
            "model_name": metrics["model_name"],
            "trained_at": metrics["trained_at"],
            "test_mape": metrics["mape"],
            "cv_mape": metrics["cv"]["mape"],
            "registered": metrics["registered"],
        }
    )
    config.REGISTRY_PATH.write_text(json.dumps(registry[-50:], indent=2))


def main(tune: bool = False) -> dict:
    result = train(load_data(), tune=tune)
    m = result["metrics"]
    return {
        "model_version": m["model_version"],
        "model_name": m["model_name"],
        "test_mae": m["mae"],
        "test_rmse": m["rmse"],
        "test_mape": m["mape"],
        "naive_test_mape": m["baseline_naive"]["mape"],
        "cv_mape": m["cv"]["mape"],
        "naive_cv_mape": m["cv"]["naive_mape"],
        "registered": m["registered"],
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--tune", action="store_true", help="run the full hyper-parameter search")
    args = parser.parse_args()
    print(json.dumps(main(tune=args.tune or not config.BEST_PARAMS_PATH.exists()), indent=2))
