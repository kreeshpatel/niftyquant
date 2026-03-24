"""
Upgrade 2A: Realistic Execution Model
Models slippage, liquidity tiers, and circuit limits for realistic fills.
"""

import sys
import logging
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import LOGS_DIR, ensure_dirs

ensure_dirs()

logger = logging.getLogger("execution")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    from logging.handlers import RotatingFileHandler
    _h = RotatingFileHandler(LOGS_DIR / "data_errors.log", maxBytes=1_000_000, backupCount=3)
    _h.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(_h)

SLIPPAGE = {"LARGE_CAP": 0.0005, "MID_CAP": 0.0015, "SMALL_CAP": 0.0030}


@dataclass
class FillResult:
    fill_price: float
    slippage_pct: float
    slippage_rs: float
    liquidity_tier: str


class ExecutionModel:

    def get_liquidity_tier(self, avg_volume: float) -> str:
        if avg_volume > 5_000_000:
            return "LARGE_CAP"
        elif avg_volume > 500_000:
            return "MID_CAP"
        return "SMALL_CAP"

    def is_circuit_day(self, today_open: float, today_close: float) -> bool:
        if today_open <= 0:
            return False
        move = abs(today_close - today_open) / today_open
        return move > 0.10

    def get_fill_price(self, ticker: str, signal_price: float,
                       direction: str, volume: float,
                       avg_volume: float, avg_daily_turnover: float = 0) -> FillResult:
        tier = self.get_liquidity_tier(avg_volume)
        slip = SLIPPAGE[tier]

        # Market impact for large orders
        if avg_daily_turnover > 0:
            position_value = signal_price * volume
            if position_value > 0.005 * avg_daily_turnover:
                slip += 0.001

        if direction == "BUY":
            fill = signal_price * (1 + slip)
        else:
            fill = signal_price * (1 - slip)

        slippage_rs = abs(fill - signal_price)

        return FillResult(
            fill_price=round(fill, 2),
            slippage_pct=round(slip * 100, 4),
            slippage_rs=round(slippage_rs, 2),
            liquidity_tier=tier,
        )
