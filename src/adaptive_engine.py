"""
Self-Improving Engine — Orchestrator
Ties contextual bandit, auto-optimizer, and online learner
into a single adaptive trading pipeline.
"""

import sys
import json
import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DATA_DIR, MODELS_DIR, RESULTS_DIR,
    MAX_POSITION_PCT, BUY_THRESHOLD,
    ensure_dirs,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"


class AdaptiveEngine:

    def __init__(self):
        from momentum_filter import MomentumFilter
        from dip_detector import DipDetector
        from bandit import ContextualBandit
        from auto_optimizer import AutoOptimizer
        from online_learner import OnlineLearner

        self.momentum_filter = MomentumFilter()
        self.dip_detector = DipDetector()
        self.bandit = ContextualBandit()
        self.optimizer = AutoOptimizer()
        self.learner = OnlineLearner()
        self.params = self.optimizer.get_current_params()

    def run_daily(self, portfolio_value=1_000_000, open_positions=None,
                  regime="BULL", date=None):
        """
        Run the full adaptive pipeline.

        Returns list of trade plan dicts, each with:
          ticker, entry, stop, target, shares, hold_days,
          dip_reason, ml_score, size_multiplier,
          conviction, strategy
        """
        open_positions = open_positions or []
        plans = []

        # ── Step 1: Auto-update checks ───────────────
        if self.learner.should_update():
            print("  Updating online model...")
            result = self.learner.update()
            print(f"  Online model AUC: {result.get('auc', 0):.3f}")

        if self.optimizer.should_run():
            print("  Running parameter optimization...")
            self.params = self.optimizer.run()
            adx = self.params.get("adx_threshold", 25)
            rsi = self.params.get("rsi_dip_level", 40)
            print(f"  New params: ADX>{adx} RSI<{rsi}")

        # ── Step 2: Signal generation ────────────────
        watchlist = self.momentum_filter.get_watchlist(date=date)
        if regime == "BEAR":
            print("  BEAR regime — blocking all entries.")
            return []

        # Apply optimized params: filter by adx and momentum_score
        if len(watchlist) > 0:
            adx_thr = self.params.get("adx_threshold", 25)
            mom_min = self.params.get("momentum_score_min", 0.5)
            watchlist = watchlist[watchlist["adx_14"] > adx_thr]
            watchlist = watchlist[watchlist["momentum_score"] >= mom_min]

        dips = self.dip_detector.scan(watchlist, date=date)

        # Apply optimized RSI/BB dip levels for re-filter
        if len(dips) > 0:
            rsi_lvl = self.params.get("rsi_dip_level", 40)
            bb_lvl = self.params.get("bb_dip_level", 0.10)
            # Keep dips where at least one condition met with current params
            mask = (
                (dips["rsi_14"] < rsi_lvl) | dips["rsi_dip"].astype(bool)
                | (dips["bb_pct"] < bb_lvl) | dips["bb_dip"].astype(bool)
                | dips["red_dip"].astype(bool)
            )
            dips = dips[mask]

        if len(dips) == 0:
            return []

        # ── Step 3: ML scoring ───────────────────────
        scored_dips = dips.copy()
        # Build feature dataframes for each dip candidate
        ml_scores = []
        for _, row in dips.iterrows():
            ticker = row["ticker"]
            path = FEATURES_DIR / f"{ticker}.NS.csv"
            if not path.exists():
                ml_scores.append(0.0)
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            if date is not None:
                df = df[df.index <= pd.Timestamp(date)]
            if df.empty:
                ml_scores.append(0.0)
                continue
            last_row = df.iloc[[-1]]
            try:
                scores = self.learner.predict(last_row)
                ml_scores.append(float(scores[0]))
            except Exception:
                ml_scores.append(0.0)

        scored_dips["ml_score"] = ml_scores
        scored_dips = scored_dips[scored_dips["ml_score"] >= 0.50].copy()

        if len(scored_dips) == 0:
            return []

        # ── Step 4: Bandit sizing ────────────────────
        atr_stop_mult = self.params.get("atr_stop_mult", 1.5)
        atr_target_mult = self.params.get("atr_target_mult", 3.0)

        open_tickers = set()
        if open_positions:
            for pos in open_positions:
                t = pos.get("ticker", pos) if isinstance(pos, dict) else str(pos)
                open_tickers.add(t)

        for _, row in scored_dips.iterrows():
            ticker = row["ticker"]
            if ticker in open_tickers:
                continue

            close = float(row["close"])
            atr = float(row["atr_14"])
            if atr <= 0 or close <= 0:
                continue

            # Build context for bandit
            context = self.bandit.build_context(
                regime=regime,
                adx=float(row.get("adx_14", 30)) if "adx_14" in row.index else 30,
                rsi=float(row["rsi_14"]),
                dip_conviction=int(row["dip_count"]),
                momentum_score=float(row["momentum_score"]),
                bb_pct=float(row["bb_pct"]),
                volume_ratio=float(row.get("volume_ratio", 1.0)) if "volume_ratio" in row.index else 1.0,
                position_in_52w=float(row.get("position_in_52w", 0.5)) if "position_in_52w" in row.index else 0.5,
            )

            arm = self.bandit.select_arm(context)
            size_mult = [0.5, 1.0, 1.5][arm]

            # ── Step 5: Trade plan ───────────────────
            entry = round(close * 1.002, 2)
            stop = round(entry - atr_stop_mult * atr, 2)
            target = round(entry + atr_target_mult * atr, 2)
            risk_per_share = entry - stop
            if risk_per_share <= 0:
                continue

            risk_amount = portfolio_value * 0.015
            base_shares = math.floor(risk_amount / risk_per_share)
            shares = max(1, round(base_shares * size_mult))

            position_value = shares * entry
            max_pos = portfolio_value * MAX_POSITION_PCT
            if position_value > max_pos:
                shares = math.floor(max_pos / entry)
                position_value = shares * entry

            if shares <= 0:
                continue

            stop_pct = round((entry - stop) / entry * 100, 2)
            target_pct = round((target - entry) / entry * 100, 2)
            rr = round((target - entry) / risk_per_share, 2)
            avg_daily = atr * 0.6
            hold_est = min(math.ceil((target - entry) / avg_daily), 30) if avg_daily > 0 else 30
            ev = round(0.45 * target_pct - 0.55 * stop_pct, 2)

            plans.append({
                "ticker": ticker,
                "entry": entry,
                "stop": stop,
                "target": target,
                "stop_pct": stop_pct,
                "target_pct": target_pct,
                "rr": rr,
                "shares": shares,
                "position_value": round(position_value),
                "position_pct": round(position_value / portfolio_value * 100, 1),
                "hold_days": hold_est,
                "expected_value_pct": ev,
                "dip_reason": row.get("dip_reason", ""),
                "ml_score": round(float(row.get("ml_score", 0)), 4),
                "size_multiplier": size_mult,
                "conviction": row.get("conviction", "MEDIUM"),
                "strategy": "ADAPTIVE",
                "bandit_arm": arm,
                "context_vector": context.tolist(),
            })

        return plans

    def record_trade_outcome(self, ticker, entry_price, exit_price,
                             exit_reason, context_vector, arm_used):
        """Update bandit after trade closes."""
        reward = (exit_price / entry_price - 1) * 100 / 10  # +10% = reward 1.0
        self.bandit.update(arm_used, np.array(context_vector), reward)

    def get_engine_status(self):
        """Dashboard-ready status dict."""
        model_info = self.learner.get_active_model_info()
        bandit_stats = self.bandit.get_stats()

        # Next optimization
        try:
            with open(MODELS_DIR / "optimizer_state.json") as f:
                opt_state = json.load(f)
            last_opt = datetime.fromisoformat(opt_state["last_run"])
            next_opt_days = max(0, 30 - (datetime.now() - last_opt).days)
            last_opt_str = last_opt.strftime("%Y-%m-%d")
        except Exception:
            next_opt_days = 0
            last_opt_str = "never"

        # Next model update
        try:
            with open(MODELS_DIR / "online_state.json") as f:
                learn_state = json.load(f)
            last_upd = datetime.fromisoformat(learn_state["last_update"])
            next_upd_days = max(0, 7 - (datetime.now() - last_upd).days)
        except Exception:
            next_upd_days = 0

        return {
            "active_model": model_info["active_model"],
            "model_auc": model_info.get("auc", 0),
            "last_optimization": last_opt_str,
            "current_params": {
                k: self.params[k] for k in [
                    "adx_threshold", "rsi_dip_level", "atr_stop_mult",
                    "atr_target_mult", "momentum_score_min", "bb_dip_level",
                ] if k in self.params
            },
            "bandit_stats": bandit_stats,
            "next_optimization_in": f"{next_opt_days} days",
            "next_model_update_in": f"{next_upd_days} days",
            "total_bandit_updates": bandit_stats["total_updates"],
        }


def print_adaptive_plans(plans):
    """Print trade plans with size multiplier and ML score."""
    for p in plans:
        mult_label = {0.5: "0.5x", 1.0: "1.0x", 1.5: "1.5x"}.get(p["size_multiplier"], "1.0x")
        print(f"  {p['ticker']:<12} | ML:{p['ml_score']:.2f} | Size:{mult_label} | "
              f"Entry:Rs {p['entry']:,.0f}  Stop:Rs {p['stop']:,.0f}  "
              f"Target:Rs {p['target']:,.0f}  "
              f"Hold:~{p['hold_days']}d | {p['dip_reason'][:40]}")


if __name__ == "__main__":
    print("=" * 70)
    print("  ADAPTIVE ENGINE — TEST")
    print("=" * 70)

    engine = AdaptiveEngine()

    # Show status
    status = engine.get_engine_status()
    print(f"\n  Active model:         {status['active_model']}")
    print(f"  Model AUC:            {status['model_auc']:.4f}")
    print(f"  Last optimization:    {status['last_optimization']}")
    print(f"  Next optimization in: {status['next_optimization_in']}")
    print(f"  Next model update in: {status['next_model_update_in']}")
    print(f"  Bandit updates:       {status['total_bandit_updates']}")
    print(f"  Current params:")
    for k, v in status["current_params"].items():
        print(f"    {k}: {v}")

    # Run on bull date
    test_date = "2024-09-15"
    print(f"\n  Running adaptive pipeline for {test_date}...")
    plans = engine.run_daily(
        portfolio_value=1_000_000,
        open_positions=[],
        regime="BULL",
        date=test_date,
    )
    print(f"  Plans generated: {len(plans)}")

    if plans:
        print_adaptive_plans(plans)

    # Run on bear date
    print(f"\n  Running adaptive pipeline for latest (bear)...")
    plans2 = engine.run_daily(
        portfolio_value=1_000_000,
        open_positions=[],
        regime="BEAR",
    )
    print(f"  Plans generated: {len(plans2)} (expected 0 — bear regime)")

    # Final status table
    print(f"\n  {'='*50}")
    print(f"  {'Component':<22} {'Status':<10} {'Details'}")
    print(f"  {'-'*50}")
    print(f"  {'Contextual bandit':<22} {'READY':<10} {status['total_bandit_updates']} updates")
    opt_detail = "Using defaults" if status["last_optimization"] == "never" else f"Optimized {status['last_optimization']}"
    print(f"  {'Auto-optimizer':<22} {'READY':<10} {opt_detail}")
    print(f"  {'Online learner':<22} {'READY':<10} AUC {status['model_auc']:.3f}")
    print(f"  {'Adaptive engine':<22} {'ACTIVE':<10} Running on live data")
    print(f"  {'='*50}")
    print()
