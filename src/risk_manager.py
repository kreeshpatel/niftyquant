"""
Upgrade 1C + 2B: Portfolio Risk Controls & Circuit Breaker
Enforces position limits, sector exposure, correlation, daily loss, and drawdown circuit breaker.
"""

import sys
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    RESULTS_DIR, LOGS_DIR, MAX_POSITIONS, MAX_POSITION_PCT,
    CIRCUIT_BREAKER_DD, CIRCUIT_BREAKER_DAYS, CIRCUIT_BREAKER_RESET,
    REGIME_BEAR_BLOCK, REGIME_CHOPPY_STRICT, CHOPPY_THRESHOLD_BOOST,
    BUY_THRESHOLD, ensure_dirs, get_sector,
)

ensure_dirs()

ENGINE_STATE_PATH = RESULTS_DIR / "engine_state.json"

logger = logging.getLogger("risk_manager")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    from logging.handlers import RotatingFileHandler
    _h = RotatingFileHandler(LOGS_DIR / "risk_decisions.log", maxBytes=1_000_000, backupCount=3)
    _h.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(_h)


@dataclass
class RiskDecision:
    allowed: bool
    reason: str
    position_size: float
    kelly_fraction: float
    risk_per_trade: float


class RiskManager:

    def __init__(self, portfolio_value: float, open_positions: list,
                 trade_history: pd.DataFrame = None):
        self.portfolio_value = portfolio_value
        self.open_positions = open_positions
        self.trade_history = trade_history if trade_history is not None else pd.DataFrame()

    def _calc_kelly(self) -> tuple:
        """Calculate half-Kelly fraction from recent trade history."""
        if self.trade_history.empty or len(self.trade_history) < 20:
            win_rate = 0.35
            avg_win = 0.14
            avg_loss = 0.044
        else:
            recent = self.trade_history.tail(50)
            wins = recent[recent["return_pct"] > 0]
            losses = recent[recent["return_pct"] <= 0]
            win_rate = len(wins) / len(recent) if len(recent) > 0 else 0.35
            avg_win = wins["return_pct"].mean() / 100 if len(wins) > 0 else 0.14
            avg_loss = abs(losses["return_pct"].mean()) / 100 if len(losses) > 0 else 0.044

        if avg_loss <= 0 or avg_win <= 0:
            return 0.05, win_rate, avg_win, avg_loss

        kelly_f = win_rate / avg_loss - (1 - win_rate) / avg_win
        half_kelly = max(kelly_f * 0.5, 0.01)
        return half_kelly, win_rate, avg_win, avg_loss

    def _sector_exposure(self, sector: str) -> float:
        """Current portfolio % allocated to a sector."""
        if self.portfolio_value <= 0:
            return 0.0
        sector_val = sum(
            p.get("current_value", p.get("position_size", 0))
            for p in self.open_positions
            if get_sector(p.get("ticker", "")) == sector
        )
        return sector_val / self.portfolio_value

    def _has_correlated_entry(self, sector: str, days: int = 5) -> str:
        """Check if same-sector position was entered within last N days."""
        cutoff = datetime.now() - timedelta(days=days)
        for p in self.open_positions:
            if get_sector(p.get("ticker", "")) == sector:
                entry = p.get("entry_date", "")
                if isinstance(entry, str) and entry:
                    try:
                        ed = datetime.fromisoformat(entry)
                        if ed >= cutoff:
                            return p.get("ticker", "")
                    except ValueError:
                        pass
        return ""

    def can_enter(self, ticker: str, sector: str, ml_score: float,
                  regime: str, entry_price: float, atr: float,
                  available_cash: float = None) -> RiskDecision:

        cash = available_cash if available_cash is not None else self.portfolio_value

        # 1. Regime block
        if REGIME_BEAR_BLOCK and regime == "BEAR":
            logger.info(f"BLOCKED {ticker}: BEAR regime")
            return RiskDecision(False, "BEAR regime — no new entries", 0, 0, 0)

        # 2. Choppy threshold boost
        if REGIME_CHOPPY_STRICT and regime == "CHOPPY":
            boosted = BUY_THRESHOLD + CHOPPY_THRESHOLD_BOOST
            if ml_score < boosted:
                logger.info(f"BLOCKED {ticker}: CHOPPY regime, ML {ml_score:.3f} < {boosted:.3f}")
                return RiskDecision(False, f"CHOPPY regime — ML {ml_score:.3f} < {boosted:.3f}", 0, 0, 0)

        # 3. Max positions
        if len(self.open_positions) >= MAX_POSITIONS:
            return RiskDecision(False, f"Max positions ({MAX_POSITIONS}) reached", 0, 0, 0)

        # 4. Sector exposure
        sec_exp = self._sector_exposure(sector)
        if sec_exp >= 0.30:
            return RiskDecision(False, f"Sector limit: {sector} at {sec_exp:.0%}", 0, 0, 0)

        # 5. Correlation filter
        corr_ticker = self._has_correlated_entry(sector)
        if corr_ticker:
            return RiskDecision(False, f"Correlated entry: {corr_ticker} entered recently", 0, 0, 0)

        # 6. Cash check
        if cash < 5000:
            return RiskDecision(False, "Insufficient cash", 0, 0, 0)

        # Position sizing via half-Kelly
        half_kelly, wr, aw, al = self._calc_kelly()
        pos_size = self.portfolio_value * min(half_kelly, MAX_POSITION_PCT)
        pos_size = max(pos_size, 5000)
        pos_size = min(pos_size, cash)
        risk = atr * 2 / entry_price if entry_price > 0 else 0.05

        logger.info(f"ALLOWED {ticker}: size={pos_size:.0f}, kelly={half_kelly:.3f}")
        return RiskDecision(True, "OK", round(pos_size, 2), round(half_kelly, 4), round(risk, 4))

    # ── Circuit Breaker ──────────────────────────────────

    def check_circuit_breaker(self, equity_curve: pd.Series) -> bool:
        """Returns True if trading should be paused."""
        if equity_curve.empty:
            return False

        peak = equity_curve.cummax()
        drawdown = (equity_curve - peak) / peak
        current_dd = drawdown.iloc[-1]

        state = self._load_state()

        # Check if already active
        if state.get("circuit_breaker_active", False):
            expiry = state.get("circuit_breaker_expiry", "")
            if expiry and datetime.now().strftime("%Y-%m-%d") < expiry:
                if abs(current_dd) >= CIRCUIT_BREAKER_RESET:
                    return True
                # Drawdown recovered but haven't passed expiry
                return True
            # Expiry passed — check if drawdown recovered
            if abs(current_dd) < CIRCUIT_BREAKER_RESET:
                state["circuit_breaker_active"] = False
                self._save_state(state)
                logger.info("CIRCUIT BREAKER: Lifted. Resuming trading.")
                print("  CIRCUIT BREAKER: Lifted. Resuming trading.")
                return False
            return True

        # Check if should trigger
        if abs(current_dd) > CIRCUIT_BREAKER_DD:
            # Calculate expiry (5 trading days from now)
            from data_fetcher import _is_trading_day
            expiry = datetime.now()
            days_added = 0
            while days_added < CIRCUIT_BREAKER_DAYS:
                expiry += timedelta(days=1)
                if _is_trading_day(expiry):
                    days_added += 1

            state["circuit_breaker_active"] = True
            state["circuit_breaker_triggered"] = datetime.now().strftime("%Y-%m-%d")
            state["circuit_breaker_expiry"] = expiry.strftime("%Y-%m-%d")
            state["circuit_breaker_dd"] = round(current_dd * 100, 2)
            self._save_state(state)

            msg = (f"CIRCUIT BREAKER: {current_dd*100:.1f}% drawdown. "
                   f"Trading paused until {expiry.strftime('%Y-%m-%d')}.")
            logger.warning(msg)
            print(f"  {msg}")
            return True

        return False

    def is_circuit_breaker_active(self) -> bool:
        state = self._load_state()
        return state.get("circuit_breaker_active", False)

    def _load_state(self) -> dict:
        if ENGINE_STATE_PATH.exists():
            with open(ENGINE_STATE_PATH) as f:
                return json.load(f)
        return {}

    def _save_state(self, state: dict):
        with open(ENGINE_STATE_PATH, "w") as f:
            json.dump(state, f, indent=2)
