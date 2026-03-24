"""Overview API — portfolio metrics and equity curve."""

import os
import json
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from config import RESULTS_DIR, INITIAL_CAPITAL

router = APIRouter(tags=["overview"])


@router.get("/overview")
def get_overview():
    portfolio = {
        "total_value": INITIAL_CAPITAL, "cash": INITIAL_CAPITAL, "invested": 0,
        "total_return_pct": 0, "drawdown_pct": 0, "peak_value": INITIAL_CAPITAL, "n_positions": 0,
    }
    equity_curve = []
    stats = {"total_trades": 0, "win_rate": 0, "profit_factor": 0,
             "avg_win": 0, "avg_loss": 0, "avg_hold_days": 0, "sharpe_ratio": 0}

    try:
        pp = os.path.join(RESULTS_DIR, "paper_portfolio.json")
        if os.path.exists(pp):
            with open(pp) as f:
                state = json.load(f)
            positions = state.get("positions", {})
            invested = sum(p.get("current_value", 0) for p in positions.values())
            total = state.get("cash", INITIAL_CAPITAL) + invested
            peak = state.get("peak_value", total)
            portfolio = {
                "total_value": round(total, 2),
                "cash": round(state.get("cash", INITIAL_CAPITAL), 2),
                "invested": round(invested, 2),
                "total_return_pct": round((total / INITIAL_CAPITAL - 1) * 100, 2),
                "drawdown_pct": round((total - peak) / max(peak, 1) * 100, 2),
                "peak_value": peak,
                "n_positions": len(positions),
            }
    except Exception:
        pass

    try:
        import pandas as pd
        hist = os.path.join(RESULTS_DIR, "portfolio_history.csv")
        if os.path.exists(hist):
            df = pd.read_csv(hist)
            for _, row in df.tail(500).iterrows():
                equity_curve.append({
                    "date": row.get("date", ""),
                    "value": row.get("total_value", INITIAL_CAPITAL),
                    "regime": row.get("regime", "CHOPPY"),
                })
    except Exception:
        pass

    try:
        import pandas as pd
        tl_path = os.path.join(RESULTS_DIR, "trade_log.csv")
        if os.path.exists(tl_path):
            tl = pd.read_csv(tl_path)
            if not tl.empty and "return_pct" in tl.columns:
                wins = tl[tl["return_pct"] > 0]
                losses = tl[tl["return_pct"] <= 0]
                stats["total_trades"] = len(tl)
                stats["win_rate"] = round(len(wins) / len(tl) * 100, 1) if len(tl) > 0 else 0
                stats["avg_win"] = round(wins["return_pct"].mean(), 2) if len(wins) > 0 else 0
                stats["avg_loss"] = round(losses["return_pct"].mean(), 2) if len(losses) > 0 else 0
                gw = wins["net_pnl"].sum() if "net_pnl" in tl.columns and len(wins) > 0 else 0
                gl = abs(losses["net_pnl"].sum()) if "net_pnl" in tl.columns and len(losses) > 0 else 1
                stats["profit_factor"] = round(gw / gl, 2) if gl > 0 else 0
                stats["avg_hold_days"] = round(tl["hold_days"].mean(), 1) if "hold_days" in tl.columns else 0
    except Exception:
        pass

    return {"portfolio": portfolio, "equity_curve": equity_curve, "metrics": stats}


@router.get("/overview/tearsheet", response_class=HTMLResponse)
def get_tearsheet():
    try:
        path = os.path.join(RESULTS_DIR, "tearsheet.html")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return f.read()
    except Exception:
        pass
    return "<html><body><h1>No tearsheet generated yet.</h1></body></html>"
