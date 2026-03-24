"""Positions API — open positions."""

import os
import json
from datetime import datetime
from fastapi import APIRouter

from config import RESULTS_DIR, get_sector

router = APIRouter(tags=["positions"])


@router.get("/positions")
def get_positions():
    try:
        pp = os.path.join(RESULTS_DIR, "paper_portfolio.json")
        if not os.path.exists(pp):
            return []

        with open(pp) as f:
            state = json.load(f)

        positions = []
        for ticker, pos in state.get("positions", {}).items():
            entry_date = pos.get("entry_date", "")
            hold_days = 0
            if entry_date:
                try:
                    hold_days = (datetime.now() - datetime.fromisoformat(entry_date)).days
                except ValueError:
                    pass

            current = pos.get("current_price", pos.get("entry_price", 0))
            stop = pos.get("atr_stop", 0)
            stop_dist = round((current - stop) / current * 100, 2) if current > 0 else 0

            positions.append({
                "ticker": ticker, "entry_date": entry_date,
                "entry_price": pos.get("entry_price", 0),
                "shares": pos.get("shares", 0),
                "position_size": pos.get("position_size", 0),
                "atr_stop": stop, "ml_score": pos.get("ml_score", 0),
                "current_price": current,
                "current_value": pos.get("current_value", 0),
                "unrealised_pnl": pos.get("unrealised_pnl", 0),
                "unrealised_pnl_pct": pos.get("unrealised_pnl_pct", 0),
                "hold_days": hold_days,
                "sector": pos.get("sector", get_sector(ticker)),
                "regime_at_entry": pos.get("regime_at_entry", ""),
                "stop_distance_pct": stop_dist,
            })

        positions.sort(key=lambda p: p["unrealised_pnl_pct"], reverse=True)
        return positions
    except Exception:
        return []
