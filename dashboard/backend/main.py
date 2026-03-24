"""
NiftyQuant Dashboard — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

import os
import json
import asyncio
from datetime import datetime

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from ws_manager import WSManager
from routers import overview, positions, signals, backtest, trades
from config import RESULTS_DIR, INITIAL_CAPITAL

app = FastAPI(title="NiftyQuant Dashboard", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
extra_origin = os.environ.get("ALLOWED_ORIGIN", "")
if extra_origin:
    ALLOWED_ORIGINS.append(extra_origin)
    if "vercel.app" in extra_origin:
        ALLOWED_ORIGINS.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overview.router, prefix="/api")
app.include_router(positions.router, prefix="/api")
app.include_router(signals.router, prefix="/api")
app.include_router(backtest.router, prefix="/api")
app.include_router(trades.router, prefix="/api")

ws_manager = WSManager()


def build_live_payload() -> dict:
    portfolio = {"total_value": INITIAL_CAPITAL, "cash": INITIAL_CAPITAL,
                 "invested": 0, "total_return_pct": 0, "drawdown_pct": 0, "n_positions": 0}
    regime = {"regime": "UNKNOWN", "confidence": 0, "vix": 0, "breadth": 0, "nifty_rsi": 0}

    try:
        pp = os.path.join(RESULTS_DIR, "paper_portfolio.json")
        if os.path.exists(pp):
            with open(pp) as f:
                state = json.load(f)
            pos = state.get("positions", {})
            invested = sum(p.get("current_value", 0) for p in pos.values())
            total = state.get("cash", INITIAL_CAPITAL) + invested
            peak = state.get("peak_value", total)
            portfolio = {
                "total_value": round(total, 2),
                "cash": round(state.get("cash", INITIAL_CAPITAL), 2),
                "invested": round(invested, 2),
                "total_return_pct": round((total / INITIAL_CAPITAL - 1) * 100, 2),
                "drawdown_pct": round((total - peak) / max(peak, 1) * 100, 2),
                "n_positions": len(pos),
            }
    except Exception:
        pass

    return {
        "type": "update",
        "timestamp": datetime.now().isoformat(),
        "portfolio": portfolio,
        "regime": regime,
    }


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            data = build_live_payload()
            await ws_manager.broadcast(json.dumps(data))
            await asyncio.sleep(10)
    except Exception:
        ws_manager.disconnect(ws)


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
