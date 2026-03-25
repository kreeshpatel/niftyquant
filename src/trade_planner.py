"""
Hybrid Engine: Trade Planner
Takes dip candidates and calculates complete, actionable
trade plans with precise entry/stop/target/sizing.
"""

import sys
import json
import math
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RESULTS_DIR, MAX_POSITION_PCT, ensure_dirs

ensure_dirs()

# ── Planner constants ────────────────────────────────────
OPEN_GAP_PCT = 0.002        # assumed 0.2% gap-up on next open
ATR_STOP_MULT = 1.5         # stop = 1.5 × ATR below entry
ATR_TARGET_MULT = 3.0       # target = 3.0 × ATR above entry
TICK_SIZE = 0.05             # NSE tick (5 paisa)
WIN_RATE = 0.45              # conservative assumption
ATR_DAILY_MOVE_RATIO = 0.6  # avg close-to-close ≈ 60% of ATR
MAX_HOLD_DISPLAY = 30        # cap displayed hold estimate


def _round_tick(price, direction="nearest"):
    """Round to nearest NSE tick (0.05)."""
    if direction == "down":
        return math.floor(price / TICK_SIZE) * TICK_SIZE
    if direction == "up":
        return math.ceil(price / TICK_SIZE) * TICK_SIZE
    return round(price / TICK_SIZE) * TICK_SIZE


class TradePlanner:

    def __init__(self, portfolio_value=1_000_000, risk_pct=0.015):
        self.portfolio_value = portfolio_value
        self.risk_pct = risk_pct

    @classmethod
    def from_portfolio(cls):
        """Load portfolio value from paper_portfolio.json."""
        try:
            with open(RESULTS_DIR / "paper_portfolio.json") as f:
                p = json.load(f)
                portfolio_value = p.get("total_value", p.get("cash", 1_000_000))
        except Exception:
            portfolio_value = 1_000_000
        return cls(portfolio_value=portfolio_value)

    def plan(self, dip_df, date=None):
        """
        Build trade plans for each dip candidate.

        Parameters
        ----------
        dip_df : pd.DataFrame
            Output from DipDetector.scan().
        date : str or None
            Signal date (for labelling output).

        Returns
        -------
        pd.DataFrame
            Full trade plans with sizing.
        """
        risk_amount = self.portfolio_value * self.risk_pct
        max_position = self.portfolio_value * MAX_POSITION_PCT
        rows = []

        for _, d in dip_df.iterrows():
            close = float(d["close"])
            atr = float(d["atr_14"])

            if atr <= 0 or close <= 0:
                continue

            # ── Entry / stop / target ────────────────────
            entry = _round_tick(close * (1 + OPEN_GAP_PCT), "nearest")
            stop = _round_tick(entry - ATR_STOP_MULT * atr, "down")
            target = _round_tick(entry + ATR_TARGET_MULT * atr, "up")

            risk_per_share = entry - stop
            if risk_per_share <= 0:
                continue

            stop_pct = round((entry - stop) / entry * 100, 2)
            target_pct = round((target - entry) / entry * 100, 2)
            rr_ratio = round((target - entry) / risk_per_share, 2)

            # ── Position sizing ──────────────────────────
            shares = math.floor(risk_amount / risk_per_share)
            if shares <= 0:
                continue

            position_value = round(shares * entry, 2)
            sizing_flag = "OK"

            if position_value > max_position:
                shares = math.floor(max_position / entry)
                position_value = round(shares * entry, 2)
                sizing_flag = "CAPPED"

            if shares <= 0:
                continue

            position_pct = round(position_value / self.portfolio_value * 100, 2)

            # ── Hold estimate ────────────────────────────
            distance = target - entry
            avg_daily = atr * ATR_DAILY_MOVE_RATIO
            est_hold = min(math.ceil(distance / avg_daily), MAX_HOLD_DISPLAY) if avg_daily > 0 else MAX_HOLD_DISPLAY

            # ── Expected value ───────────────────────────
            ev_pct = round(WIN_RATE * target_pct - (1 - WIN_RATE) * stop_pct, 2)

            rows.append({
                "ticker": d["ticker"],
                "date": d.get("date", str(date) if date else ""),
                "conviction": d["conviction"],
                "dip_reason": d["dip_reason"],
                "momentum_score": round(float(d["momentum_score"]), 4),
                "rsi_14": round(float(d["rsi_14"]), 2),
                "entry_price": round(entry, 2),
                "stop_price": round(stop, 2),
                "target_price": round(target, 2),
                "stop_pct": stop_pct,
                "target_pct": target_pct,
                "rr_ratio": rr_ratio,
                "shares": shares,
                "position_value": position_value,
                "position_pct": position_pct,
                "risk_amount": round(shares * risk_per_share, 2),
                "estimated_hold_days": est_hold,
                "expected_value_pct": ev_pct,
                "sizing_flag": sizing_flag,
            })

        if not rows:
            return pd.DataFrame(columns=[
                "ticker", "date", "conviction", "dip_reason",
                "momentum_score", "rsi_14",
                "entry_price", "stop_price", "target_price",
                "stop_pct", "target_pct", "rr_ratio",
                "shares", "position_value", "position_pct",
                "risk_amount", "estimated_hold_days",
                "expected_value_pct", "sizing_flag",
            ])

        return pd.DataFrame(rows)

    def to_signals_json(self, plan_df):
        """Convert plan DataFrame to dashboard-friendly JSON list."""
        signals = []
        for _, r in plan_df.iterrows():
            signals.append({
                "ticker": r["ticker"],
                "conviction": r["conviction"],
                "dip_reason": r["dip_reason"],
                "entry": r["entry_price"],
                "stop": r["stop_price"],
                "target": r["target_price"],
                "stop_pct": r["stop_pct"],
                "target_pct": r["target_pct"],
                "rr": r["rr_ratio"],
                "shares": int(r["shares"]),
                "capital": round(r["position_value"]),
                "hold_days": int(r["estimated_hold_days"]),
                "expected_value_pct": r["expected_value_pct"],
            })
        return signals


def _print_trade_card(r):
    """Pretty-print a single trade plan."""
    w = 42
    ticker = r["ticker"]
    conv = r["conviction"]
    reason = r["dip_reason"]
    entry = r["entry_price"]
    stop = r["stop_price"]
    target = r["target_price"]
    stop_p = r["stop_pct"]
    target_p = r["target_pct"]
    rr = r["rr_ratio"]
    shares = int(r["shares"])
    pos_val = r["position_value"]
    pos_pct = r["position_pct"]
    risk_amt = r["risk_amount"]
    risk_sh = round(entry - stop, 2)
    hold = int(r["estimated_hold_days"])
    ev = r["expected_value_pct"]
    flag = r["sizing_flag"]

    flag_str = f"  [{flag}]" if flag != "OK" else ""

    print(f"\n  +{'='*w}+")
    print(f"  | {ticker:<14s} . {conv:>6s} conviction{' '*(w-33-len(ticker))}|")
    print(f"  | {reason[:w-4]:<{w-4}s}  |")
    print(f"  +{'-'*w}+")
    print(f"  | {'Entry':10s}: Rs {entry:>10,.2f}{' '*(w-28)}|")
    print(f"  | {'Stop':10s}: Rs {stop:>10,.2f}  (-{stop_p:.1f}%){' '*(w-36-len(f'{stop_p:.1f}'))}|")
    print(f"  | {'Target':10s}: Rs {target:>10,.2f}  (+{target_p:.1f}%){' '*(w-37-len(f'{target_p:.1f}'))}|")
    print(f"  | {'R:R':10s}: {rr:.1f} : 1{' '*(w-20-len(f'{rr:.1f}'))}|")
    print(f"  +{'-'*w}+")
    cap_str = f"Rs {pos_val:>,.0f}  ({pos_pct:.1f}%){flag_str}"
    risk_str = f"Rs {risk_amt:>,.0f}  (Rs {risk_sh:,.0f}/sh)"
    print(f"  | {'Shares':10s}: {shares:<{w-14}}|")
    print(f"  | {'Capital':10s}: {cap_str:<{w-14}}|")
    print(f"  | {'Risk':10s}: {risk_str:<{w-14}}|")
    print(f"  | {'Hold est':10s}: ~{hold} days{' '*(w-18-len(str(hold)))}|")
    print(f"  | {'Exp value':10s}: {'+' if ev>=0 else ''}{ev:.1f}% per trade{' '*(w-27-len(f'{ev:.1f}'))}|")
    print(f"  +{'='*w}+")


if __name__ == "__main__":
    from momentum_filter import MomentumFilter
    from dip_detector import DipDetector

    test_date = "2024-09-15"
    print(f"{'='*60}")
    print(f"TRADE PLANNER — {test_date}")
    print(f"{'='*60}")

    mf = MomentumFilter()
    dd = DipDetector()

    wl = mf.get_watchlist(date=test_date)
    print(f"Momentum watchlist : {len(wl)} stocks")

    dips = dd.scan(wl, date=test_date)
    print(f"Dip candidates     : {len(dips)} stocks")

    tp = TradePlanner.from_portfolio()
    print(f"Portfolio value     : Rs {tp.portfolio_value:,.0f}")
    print(f"Risk per trade      : {tp.risk_pct*100:.1f}% = Rs {tp.portfolio_value*tp.risk_pct:,.0f}")

    plans = tp.plan(dips, date=test_date)
    print(f"Trade plans         : {len(plans)}")

    for _, r in plans.iterrows():
        _print_trade_card(r)

    # ── Save outputs ─────────────────────────────────────
    csv_path = RESULTS_DIR / "trade_plans_latest.csv"
    plans.to_csv(csv_path, index=False)
    print(f"\nSaved CSV  -> {csv_path}")

    json_path = RESULTS_DIR / "signals_today.json"
    signals = tp.to_signals_json(plans)
    with open(json_path, "w") as f:
        json.dump(signals, f, indent=2)
    print(f"Saved JSON -> {json_path}")

    # ── Verify R:R ───────────────────────────────────────
    if len(plans) > 0:
        min_rr = plans["rr_ratio"].min()
        print(f"\nMin R:R across all plans: {min_rr:.2f}")
        if min_rr < 2.0:
            print("WARNING: R:R below 2.0 detected — would flag as SKIP")
        else:
            print("All plans >= 2.0 R:R")
