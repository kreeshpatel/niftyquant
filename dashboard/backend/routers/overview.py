"""Overview API — portfolio metrics and equity curve."""

import sys
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import pandas as pd
import json

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from config import RESULTS_DIR, INITIAL_CAPITAL

router = APIRouter(tags=["overview"])


@router.get("/overview")
def get_overview():
    # Portfolio state
    portfolio_path = RESULTS_DIR / "paper_portfolio.json"
    portfolio = {}
    if portfolio_path.exists():
        with open(portfolio_path) as f:
            state = json.load(f)
        positions = state.get("positions", {})
        invested = sum(p.get("current_value", 0) for p in positions.values())
        total = state.get("cash", INITIAL_CAPITAL) + invested
        portfolio = {
            "total_value": round(total, 2),
            "cash": round(state.get("cash", INITIAL_CAPITAL), 2),
            "invested": round(invested, 2),
            "total_return_pct": round((total / INITIAL_CAPITAL - 1) * 100, 2),
            "drawdown_pct": round((total - state.get("peak_value", total)) / max(state.get("peak_value", total), 1) * 100, 2),
            "peak_value": state.get("peak_value", INITIAL_CAPITAL),
            "n_positions": len(positions),
        }

    # Equity curve from portfolio history
    equity_curve = []
    hist_path = RESULTS_DIR / "portfolio_history.csv"
    if hist_path.exists():
        df = pd.read_csv(hist_path)
        for _, row in df.tail(500).iterrows():
            equity_curve.append({
                "date": row.get("date", ""),
                "value": row.get("total_value", INITIAL_CAPITAL),
                "regime": row.get("regime", "CHOPPY"),
            })

    # Trade stats
    trades_path = RESULTS_DIR / "trade_log.csv"
    stats = {"total_trades": 0, "win_rate": 0, "profit_factor": 0,
             "avg_win": 0, "avg_loss": 0, "avg_hold_days": 0, "sharpe_ratio": 0}
    if trades_path.exists():
        tl = pd.read_csv(trades_path)
        if not tl.empty and "return_pct" in tl.columns:
            wins = tl[tl["return_pct"] > 0]
            losses = tl[tl["return_pct"] <= 0]
            stats["total_trades"] = len(tl)
            stats["win_rate"] = round(len(wins) / len(tl) * 100, 1) if len(tl) > 0 else 0
            stats["avg_win"] = round(wins["return_pct"].mean(), 2) if len(wins) > 0 else 0
            stats["avg_loss"] = round(losses["return_pct"].mean(), 2) if len(losses) > 0 else 0
            gross_w = wins["net_pnl"].sum() if "net_pnl" in tl.columns and len(wins) > 0 else 0
            gross_l = abs(losses["net_pnl"].sum()) if "net_pnl" in tl.columns and len(losses) > 0 else 1
            stats["profit_factor"] = round(gross_w / gross_l, 2) if gross_l > 0 else 0
            stats["avg_hold_days"] = round(tl["hold_days"].mean(), 1) if "hold_days" in tl.columns else 0

    return {"portfolio": portfolio, "equity_curve": equity_curve, "metrics": stats}


@router.get("/overview/tearsheet", response_class=HTMLResponse)
def get_tearsheet():
    path = RESULTS_DIR / "tearsheet.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return "<html><body><h1>No tearsheet generated yet.</h1></body></html>"
