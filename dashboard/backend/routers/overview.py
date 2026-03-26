"""Overview API — portfolio metrics and equity curve."""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from config import INITIAL_CAPITAL
from github_data import fetch_github_json, fetch_github_csv, fetch_github_file

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

    # ── Read locked production metrics ──────────────────────────────
    production = fetch_github_json("results/production_strategy.json")
    perf = production.get("performance", {}) if production else {}

    try:
        state = fetch_github_json("results/paper_portfolio.json")
        if state:
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
        df = fetch_github_csv("results/portfolio_history.csv")
        if df is not None and not df.empty:
            for _, row in df.tail(500).iterrows():
                equity_curve.append({
                    "date": row.get("date", ""),
                    "value": row.get("total_value", INITIAL_CAPITAL),
                    "regime": row.get("regime", "CHOPPY"),
                })
    except Exception:
        pass

    # ── Compute stats from trade log as fallback ────────────────────
    try:
        tl = fetch_github_csv("results/trade_log.csv")
        if tl is not None and not tl.empty and "return_pct" in tl.columns:
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

    # ── Override with locked production values where available ──────
    if perf:
        stats["win_rate"] = perf.get("win_rate_pct", stats["win_rate"])
        stats["profit_factor"] = perf.get("profit_factor", stats["profit_factor"])
        stats["sharpe_ratio"] = perf.get("sharpe", stats["sharpe_ratio"])
        stats["total_trades"] = perf.get("total_trades", stats["total_trades"])
        stats["avg_win"] = perf.get("avg_win_pct", stats["avg_win"])
        stats["avg_loss"] = perf.get("avg_loss_pct", stats["avg_loss"])
        portfolio["backtest_return_pct"] = perf.get("total_return_pct", 0)
        portfolio["max_drawdown_pct"] = perf.get("max_drawdown_pct", 0)

    strategy_version = production.get("version") if production else None

    return {
        "portfolio": portfolio,
        "equity_curve": equity_curve,
        "metrics": stats,
        "strategy_version": strategy_version,
    }


@router.get("/overview/tearsheet", response_class=HTMLResponse)
def get_tearsheet():
    try:
        html = fetch_github_file("results/tearsheet.html")
        if html:
            return html
    except Exception:
        pass
    return "<html><body><h1>No tearsheet generated yet.</h1></body></html>"
