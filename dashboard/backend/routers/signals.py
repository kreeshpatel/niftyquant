"""Signals API — signal scanner endpoints."""

import sys
from pathlib import Path
from fastapi import APIRouter

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from config import RESULTS_DIR, MIN_ADX, BUY_THRESHOLD, get_sector

router = APIRouter(tags=["signals"])


@router.get("/signals")
def get_signals():
    try:
        from paper_trader import PaperTrader
        from risk_manager import RiskManager
        from regime_detector import RegimeDetector
        import json

        det = RegimeDetector()
        regime_result = det.detect()
        regime = regime_result.regime

        pt = PaperTrader()
        raw_signals = pt.scan_signals(regime=regime)

        portfolio_path = RESULTS_DIR / "paper_portfolio.json"
        pv = 1_000_000
        positions = []
        if portfolio_path.exists():
            with open(portfolio_path) as f:
                state = json.load(f)
            invested = sum(p.get("current_value", 0) for p in state.get("positions", {}).values())
            pv = state.get("cash", 1_000_000) + invested
            positions = list(state.get("positions", {}).values())

        rm = RiskManager(pv, positions)

        signals = []
        for sig in raw_signals[:20]:
            decision = rm.can_enter(
                ticker=sig.ticker, sector=sig.sector,
                ml_score=sig.ml_score, regime=regime,
                entry_price=sig.entry_price,
                atr=sig.entry_price - sig.atr_stop,
                available_cash=state.get("cash", pv) if portfolio_path.exists() else pv,
            )
            signals.append({
                "ticker": sig.ticker,
                "ml_score": sig.ml_score,
                "signal_score": sig.signal_score,
                "entry_price": sig.entry_price,
                "atr_stop": sig.atr_stop,
                "sector": sig.sector,
                "risk_allowed": decision.allowed,
                "risk_reason": decision.reason,
                "position_size_suggested": decision.position_size,
            })

        return {"signals": signals, "regime": regime, "date": regime_result.date}
    except Exception as e:
        return {"signals": [], "regime": "UNKNOWN", "date": "", "error": str(e)}
