"""
Self-Improving Engine — Component 2: Auto-Optimizer
Walk-forward parameter optimization using recent market data.
Runs every 30 days to adapt strategy parameters.
"""

import sys
import json
import math
import itertools
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    DATA_DIR, MODELS_DIR, RESULTS_DIR,
    INITIAL_CAPITAL, MAX_POSITIONS, MAX_POSITION_PCT,
    BROKERAGE_PCT, STT_PCT, BUY_THRESHOLD,
    NIFTY_500, ensure_dirs,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"
OPTIMIZE_INTERVAL_DAYS = 30

DEFAULT_PARAMS = {
    "adx_threshold": 25,
    "rsi_dip_level": 40,
    "atr_stop_mult": 1.5,
    "atr_target_mult": 3.0,
    "momentum_score_min": 0.5,
    "bb_dip_level": 0.10,
}

PARAM_GRID = {
    "adx_threshold": [20, 25, 28, 30],
    "rsi_dip_level": [35, 40, 45],
    "atr_stop_mult": [1.0, 1.5, 2.0],
    "atr_target_mult": [2.5, 3.0, 3.5],
    "momentum_score_min": [0.4, 0.5, 0.6],
    "bb_dip_level": [0.05, 0.10, 0.15],
}


class AutoOptimizer:

    def __init__(self, feature_dir=None, results_dir=None, state_file=None):
        self.feature_dir = Path(feature_dir) if feature_dir else FEATURES_DIR
        self.results_dir = Path(results_dir) if results_dir else RESULTS_DIR
        self.state_file = Path(state_file) if state_file else MODELS_DIR / "optimizer_state.json"
        self.params_file = MODELS_DIR / "optimal_params.json"

    def should_run(self):
        if not self.state_file.exists():
            return True
        try:
            with open(self.state_file) as f:
                state = json.load(f)
            last_run = datetime.fromisoformat(state["last_run"])
            return (datetime.now() - last_run).days >= OPTIMIZE_INTERVAL_DAYS
        except Exception:
            return True

    def _load_recent_data(self, lookback_days):
        """Load feature data for the most recent lookback_days trading days."""
        frames = []
        for ticker in NIFTY_500:
            path = self.feature_dir / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            df["ticker"] = ticker
            frames.append(df)
        if not frames:
            return pd.DataFrame()
        master = pd.concat(frames)
        all_dates = master.index.unique().sort_values()
        cutoff = all_dates[-lookback_days] if len(all_dates) >= lookback_days else all_dates[0]
        return master[master.index >= cutoff]

    def _mini_backtest(self, data, params, precomputed=None):
        """Run a fast mini-backtest on the data window with given params.
        Uses precomputed dict-of-dicts for speed when called 972 times."""
        if precomputed is None:
            return self._mini_backtest_slow(data, params)

        all_dates = precomputed["dates"]
        by_date = precomputed["by_date"]

        cash = float(INITIAL_CAPITAL)
        positions = {}
        trades = []

        for date in all_dates:
            day = by_date.get(date, {})

            # Check exits
            to_close = []
            for ticker, pos in positions.items():
                row = day.get(ticker)
                if row is None:
                    continue
                target = pos["entry"] + params["atr_target_mult"] * pos["atr"]
                stop = pos["entry"] - params["atr_stop_mult"] * pos["atr"]

                exit_price = None
                if row["High"] >= target:
                    exit_price = target
                elif row["Low"] <= stop:
                    exit_price = stop
                elif row.get("ema_cross_down", 0) == 1:
                    exit_price = row["Close"]

                if exit_price is not None:
                    ret = (exit_price / pos["entry"] - 1) * 100
                    net = pos["shares"] * (exit_price - pos["entry"]) * (1 - BROKERAGE_PCT - STT_PCT)
                    trades.append(ret)
                    cash += pos["shares"] * exit_price * (1 - BROKERAGE_PCT - STT_PCT)
                    to_close.append(ticker)

            for t in to_close:
                del positions[t]

            # Check entries
            if len(positions) >= MAX_POSITIONS:
                continue
            for ticker, row in day.items():
                if ticker in positions or len(positions) >= MAX_POSITIONS:
                    break

                if row.get("ema_21_above_50", 0) != 1:
                    continue
                if row.get("price_vs_ema21_pct", 0) <= 0:
                    continue
                if row.get("adx_14", 0) <= params["adx_threshold"]:
                    continue
                if row.get("position_in_52w", 0) <= 0.5:
                    continue
                if row.get("volume_ratio", 0) <= 0.8:
                    continue

                rsi_dip = row.get("rsi_14", 50) < params["rsi_dip_level"]
                bb_dip = row.get("bb_pct", 0.5) < params["bb_dip_level"]
                red_dip = row.get("red_candle_signal", 0) == 1
                if not (rsi_dip or bb_dip or red_dip):
                    continue

                adx = row.get("adx_14", 0)
                pos52 = row.get("position_in_52w", 0)
                rsi = row.get("rsi_14", 0)
                ema_gap = row.get("ema9_vs_ema21_pct", 0)
                mom = (adx / 100) * 0.3 + pos52 * 0.3 + (rsi / 100) * 0.2 + (max(-5, min(5, ema_gap)) / 5) * 0.2
                if mom < params["momentum_score_min"]:
                    continue

                entry = row["Close"] * 1.002
                atr = row.get("atr_14", 0)
                if atr <= 0 or entry <= 0:
                    continue

                risk_per_share = params["atr_stop_mult"] * atr
                risk_amount = cash * 0.015
                shares = math.floor(risk_amount / risk_per_share) if risk_per_share > 0 else 0
                if shares <= 0:
                    continue
                cost = shares * entry * (1 + BROKERAGE_PCT)
                if cost > cash * MAX_POSITION_PCT or cost > cash:
                    continue

                positions[ticker] = {"entry": entry, "shares": shares, "atr": atr}
                cash -= cost

        if not trades:
            return {"return": 0, "sharpe": 0, "win_rate": 0, "pf": 0, "dd": 0, "n_trades": 0}

        rets = np.array(trades)
        wins = rets[rets > 0]
        sharpe = (rets.mean() / rets.std()) if rets.std() > 0 else 0
        wr = len(wins) / len(rets) * 100

        return {
            "return": 0,
            "sharpe": round(float(sharpe), 3),
            "win_rate": round(float(wr), 1),
            "pf": round(float(wins.sum() / abs(rets[rets <= 0].sum())) if rets[rets <= 0].sum() != 0 else 0, 2),
            "dd": 0,
            "n_trades": len(trades),
        }

    def _mini_backtest_slow(self, data, params):
        """Fallback slow version for single runs."""
        all_dates = data.index.unique().sort_values()
        by_date = {}
        for date in all_dates:
            day_data = data.loc[[date]] if date in data.index else pd.DataFrame()
            d = {}
            for _, row in day_data.iterrows():
                d[row["ticker"]] = row.to_dict()
            by_date[date] = d
        return self._mini_backtest(data, params, {"dates": all_dates, "by_date": by_date})

    def run(self, lookback_days=90):
        """Optimize parameters on recent data window."""
        print(f"  Loading recent {lookback_days} trading days of data...")
        data = self._load_recent_data(lookback_days)
        if data.empty:
            print("  No data available for optimization.")
            return DEFAULT_PARAMS.copy()

        n_dates = data.index.nunique()
        print(f"  Data window: {n_dates} trading days, {data['ticker'].nunique()} stocks")

        # Precompute data structure once (huge speedup)
        print(f"  Precomputing data lookups...")
        all_dates = data.index.unique().sort_values()
        by_date = {}
        for date in all_dates:
            day_data = data.loc[[date]]
            d = {}
            for _, row in day_data.iterrows():
                d[row["ticker"]] = row.to_dict()
            by_date[date] = d
        precomputed = {"dates": all_dates, "by_date": by_date}

        # Generate all param combos
        keys = list(PARAM_GRID.keys())
        combos = list(itertools.product(*PARAM_GRID.values()))
        print(f"  Testing {len(combos)} parameter combinations...")

        results = []
        for i, vals in enumerate(combos):
            params = dict(zip(keys, vals))
            r = self._mini_backtest(data, params, precomputed)

            # Balanced score
            score = (r["sharpe"] * 0.4) + (r["pf"] * 0.3) + (r["win_rate"] / 100 * 0.3)
            results.append({**params, **r, "score": round(score, 4)})

            if (i + 1) % 200 == 0:
                print(f"    {i+1}/{len(combos)} tested...")

        results_df = pd.DataFrame(results).sort_values("score", ascending=False)
        best = results_df.iloc[0]

        best_params = {k: best[k] for k in keys}
        best_params["optimized_on"] = datetime.now().strftime("%Y-%m-%d")
        best_params["lookback_days"] = lookback_days
        best_params["top_score"] = float(best["score"])
        best_params["n_trades_in_window"] = int(best["n_trades"])

        # Save best params
        self.params_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.params_file, "w") as f:
            json.dump(best_params, f, indent=2)

        # Save state
        with open(self.state_file, "w") as f:
            json.dump({"last_run": datetime.now().isoformat()}, f, indent=2)

        # Save history
        hist_path = self.results_dir / "optimization_history.csv"
        top10 = results_df.head(10)
        top10["date"] = datetime.now().strftime("%Y-%m-%d")
        if hist_path.exists():
            top10.to_csv(hist_path, mode="a", header=False, index=False)
        else:
            top10.to_csv(hist_path, index=False)

        print(f"\n  Best params (score={best['score']:.4f}, "
              f"{int(best['n_trades'])} trades):")
        for k in keys:
            print(f"    {k}: {best_params[k]}")

        return best_params

    def get_current_params(self):
        """Load optimised params or return defaults."""
        if not self.params_file.exists():
            return DEFAULT_PARAMS.copy()
        try:
            with open(self.params_file) as f:
                params = json.load(f)
            opt_date = datetime.strptime(params.get("optimized_on", "2000-01-01"), "%Y-%m-%d")
            if (datetime.now() - opt_date).days > 45:
                print("  WARNING: Optimized params are > 45 days old, using defaults.")
                return DEFAULT_PARAMS.copy()
            return params
        except Exception:
            return DEFAULT_PARAMS.copy()


if __name__ == "__main__":
    print("=" * 60)
    print("  AUTO-OPTIMIZER — TEST")
    print("=" * 60)

    opt = AutoOptimizer()

    # Run defaults baseline
    print("\n  Running with DEFAULT params...")
    data = opt._load_recent_data(90)
    if not data.empty:
        default_result = opt._mini_backtest(data, DEFAULT_PARAMS)
        default_score = (default_result["sharpe"] * 0.4 +
                         default_result["pf"] * 0.3 +
                         default_result["win_rate"] / 100 * 0.3)
        print(f"  Default score: {default_score:.4f} ({default_result['n_trades']} trades, "
              f"WR={default_result['win_rate']}%, PF={default_result['pf']})")

    # Run optimization
    print("\n  Running optimization...")
    best = opt.run(lookback_days=90)

    print(f"\n  Score comparison:")
    print(f"    Defaults : {default_score:.4f}")
    print(f"    Optimized: {best.get('top_score', 0):.4f}")
    improvement = best.get("top_score", 0) - default_score
    print(f"    Delta    : {improvement:+.4f}")
    print()
