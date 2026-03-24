"""Signals API — returns empty on Railway (scanner runs locally)."""

from fastapi import APIRouter

router = APIRouter(tags=["signals"])


@router.get("/signals")
def get_signals():
    # Signal scanning requires local src/ modules (paper_trader, regime_detector, etc.)
    # On Railway deployment, return empty — scanning only runs via daily_runner.py locally
    return {"signals": [], "regime": "UNKNOWN", "date": "",
            "message": "Signal scanning available in local mode only"}
