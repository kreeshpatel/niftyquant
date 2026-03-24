"""
Phase 5: Paper Trading Engine
Simulates live trading with persistent virtual portfolio.
"""

import sys
import json
import math
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    DATA_DIR, RESULTS_DIR, LOGS_DIR, NIFTY_500,
    INITIAL_CAPITAL, MAX_POSITIONS, MIN_ADX,
    BUY_THRESHOLD, BROKERAGE_PCT, STT_PCT, ATR_STOP_MULTIPLIER,
    ensure_dirs, get_sector,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"
PORTFOLIO_PATH = RESULTS_DIR / "paper_portfolio.json"
TRADES_CSV = RESULTS_DIR / "paper_trades.csv"
PORTFOLIO_HISTORY = RESULTS_DIR / "portfolio_history.csv"


@dataclass
class Signal:
    ticker: str
    date: str
    ml_score: float
    signal_score: float
    entry_price: float
    atr_stop: float
    sector: str
    regime: str


class PaperTrader:

    def __init__(self):
        self.state = self._load_state()
        self.ml_model = None
        self.execution = None

    def _load_state(self) -> dict:
        if PORTFOLIO_PATH.exists():
            with open(PORTFOLIO_PATH) as f:
                return json.load(f)
        state = {
            "cash": INITIAL_CAPITAL,
            "positions": {},
            "total_trades": 0,
            "created_date": datetime.now().strftime("%Y-%m-%d"),
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "peak_value": INITIAL_CAPITAL,
        }
        self._save_state(state)
        return state

    def _save_state(self, state: dict = None):
        if state is None:
            state = self.state
        state["last_updated"] = datetime.now().strftime("%Y-%m-%d")
        with open(PORTFOLIO_PATH, "w") as f:
            json.dump(state, f, indent=2)

    def _get_ml_model(self):
        if self.ml_model is None:
            from ml_model import MLModel
            self.ml_model = MLModel()
            self.ml_model.ensure_current()
        return self.ml_model

    def _get_execution(self):
        if self.execution is None:
            from execution_model import ExecutionModel
            self.execution = ExecutionModel()
        return self.execution

    def _load_features(self, ticker: str) -> pd.DataFrame:
        path = FEATURES_DIR / f"{ticker}.NS.csv"
        if not path.exists():
            return pd.DataFrame()
        return pd.read_csv(path, index_col="Date", parse_dates=True)

    def scan_signals(self, regime: str = "CHOPPY") -> list:
        ml = self._get_ml_model()
        signals = []

        for ticker in NIFTY_500:
            df = self._load_features(ticker)
            if df.empty or len(df) < 5:
                continue

            # Check last 5 days for ema_cross_up
            recent = df.tail(5)
            has_cross = recent["ema_cross_up"].sum() > 0
            if not has_cross:
                continue

            last = df.iloc[-1]
            if last.get("ema_21_above_50", 0) != 1:
                continue
            if last.get("adx_14", 0) <= MIN_ADX:
                continue
            if last.get("rsi_14", 0) <= 50:
                continue

            # ML score
            row_df = df.iloc[[-1]][ml.feature_columns]
            if row_df.isna().any(axis=1).iloc[0]:
                continue
            ml_score = float(ml.model.predict_proba(row_df.values)[:, 1][0])
            if ml_score < BUY_THRESHOLD:
                continue

            entry_price = float(last["Close"])
            atr = float(last.get("atr_14", entry_price * 0.03))
            adx = float(last.get("adx_14", 0))
            rsi = float(last.get("rsi_14", 0))
            score = (min(adx, 100) / 100) * 0.5 + (min(rsi, 100) / 100) * 0.5

            signals.append(Signal(
                ticker=ticker,
                date=df.index[-1].strftime("%Y-%m-%d"),
                ml_score=round(ml_score, 4),
                signal_score=round(score, 4),
                entry_price=round(entry_price, 2),
                atr_stop=round(entry_price - ATR_STOP_MULTIPLIER * atr, 2),
                sector=get_sector(ticker),
                regime=regime,
            ))

        signals.sort(key=lambda s: s.ml_score, reverse=True)
        return signals

    def enter_position(self, signal: Signal, risk_decision=None) -> bool:
        pos_size = risk_decision.position_size if risk_decision else 50000
        ex = self._get_execution()

        # Get fill price
        avg_vol = 1_000_000  # Default
        fill = ex.get_fill_price(signal.ticker, signal.entry_price, "BUY",
                                  0, avg_vol)
        entry_price = fill.fill_price

        shares = math.floor(pos_size / (entry_price * (1 + BROKERAGE_PCT)))
        if shares <= 0:
            return False

        actual_cost = shares * entry_price * (1 + BROKERAGE_PCT)
        if actual_cost > self.state["cash"]:
            return False

        self.state["cash"] -= actual_cost
        self.state["positions"][signal.ticker] = {
            "ticker": signal.ticker,
            "entry_date": signal.date,
            "entry_price": round(entry_price, 2),
            "shares": shares,
            "position_size": round(actual_cost, 2),
            "atr_stop": signal.atr_stop,
            "ml_score": signal.ml_score,
            "signal_score": signal.signal_score,
            "regime_at_entry": signal.regime,
            "sector": signal.sector,
            "current_price": round(entry_price, 2),
            "current_value": round(shares * entry_price, 2),
            "unrealised_pnl": 0.0,
            "unrealised_pnl_pct": 0.0,
        }
        self.state["total_trades"] += 1
        self._save_state()
        return True

    def scan_exits(self) -> list:
        exits = []
        for ticker, pos in self.state["positions"].items():
            df = self._load_features(ticker)
            if df.empty:
                continue
            last = df.iloc[-1]

            if last["Low"] <= pos["atr_stop"]:
                exits.append({"ticker": ticker, "reason": "stop_loss",
                              "exit_price": pos["atr_stop"]})
            elif last.get("ema_cross_down", 0) == 1:
                exits.append({"ticker": ticker, "reason": "ema_reversal",
                              "exit_price": float(last["Close"])})
        return exits

    def exit_position(self, ticker: str, reason: str, exit_price: float = None) -> dict:
        if ticker not in self.state["positions"]:
            return {}
        pos = self.state["positions"][ticker]

        ex = self._get_execution()
        if exit_price is None:
            exit_price = pos["current_price"]
        fill = ex.get_fill_price(ticker, exit_price, "SELL", 0, 1_000_000)

        proceeds = pos["shares"] * fill.fill_price * (1 - BROKERAGE_PCT - STT_PCT)
        cost_basis = pos["shares"] * pos["entry_price"] * (1 + BROKERAGE_PCT)
        net_pnl = proceeds - cost_basis
        ret_pct = (fill.fill_price / pos["entry_price"] - 1) * 100
        hold_days = (datetime.now() - datetime.fromisoformat(pos["entry_date"])).days

        trade = {
            "ticker": ticker, "entry_date": pos["entry_date"],
            "exit_date": datetime.now().strftime("%Y-%m-%d"),
            "entry_price": pos["entry_price"], "exit_price": round(fill.fill_price, 2),
            "shares": pos["shares"], "net_pnl": round(net_pnl, 2),
            "return_pct": round(ret_pct, 2), "hold_days": hold_days,
            "exit_reason": reason,
        }

        # Append to trades CSV
        trade_df = pd.DataFrame([trade])
        if TRADES_CSV.exists():
            trade_df.to_csv(TRADES_CSV, mode="a", header=False, index=False)
        else:
            trade_df.to_csv(TRADES_CSV, index=False)

        self.state["cash"] += proceeds
        del self.state["positions"][ticker]
        self._save_state()
        return trade

    def update_prices(self):
        for ticker, pos in self.state["positions"].items():
            df = self._load_features(ticker)
            if df.empty:
                continue
            price = float(df.iloc[-1]["Close"])
            pos["current_price"] = round(price, 2)
            pos["current_value"] = round(pos["shares"] * price, 2)
            cost = pos["shares"] * pos["entry_price"]
            pos["unrealised_pnl"] = round(pos["current_value"] - cost, 2)
            pos["unrealised_pnl_pct"] = round((price / pos["entry_price"] - 1) * 100, 2)
        self._save_state()

    def get_portfolio_summary(self) -> dict:
        invested = sum(p["current_value"] for p in self.state["positions"].values())
        total = self.state["cash"] + invested
        peak = max(self.state.get("peak_value", INITIAL_CAPITAL), total)
        self.state["peak_value"] = peak
        dd = (total - peak) / peak * 100 if peak > 0 else 0
        total_ret = (total / INITIAL_CAPITAL - 1) * 100

        return {
            "cash": round(self.state["cash"], 2),
            "invested_value": round(invested, 2),
            "total_value": round(total, 2),
            "total_return_pct": round(total_ret, 2),
            "drawdown_pct": round(dd, 2),
            "open_positions": len(self.state["positions"]),
            "peak_value": round(peak, 2),
            "positions": self.state["positions"],
        }
