"""Backtest API — run backtests from the UI."""

import sys
import uuid
import threading
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from config import RESULTS_DIR

router = APIRouter(tags=["backtest"])

# In-memory job store
_jobs: dict = {}


class BacktestParams(BaseModel):
    start_date: str = "2022-01-01"
    end_date: str = "2026-03-24"
    use_ml: bool = True
    buy_threshold: float = 0.52
    initial_capital: float = 1_000_000
    max_positions: int = 20


def _run_backtest_job(job_id: str, params: BacktestParams):
    try:
        from backtester import Backtester
        bt = Backtester(use_ml=params.use_ml)
        result = bt.run(params.start_date, params.end_date)

        _jobs[job_id] = {
            "status": "complete",
            "result": {
                "total_return_pct": result.total_return_pct,
                "annualised_return_pct": result.annualised_return_pct,
                "sharpe_ratio": result.sharpe_ratio,
                "sortino_ratio": result.sortino_ratio,
                "max_drawdown_pct": result.max_drawdown_pct,
                "total_trades": result.total_trades,
                "win_rate_pct": result.win_rate_pct,
                "avg_win_pct": result.avg_win_pct,
                "avg_loss_pct": result.avg_loss_pct,
                "profit_factor": result.profit_factor,
                "avg_hold_days": result.avg_hold_days,
                "stops_hit": result.stops_hit,
                "ema_reversals": result.ema_reversals,
                "nifty_return_pct": result.nifty_return_pct,
                "alpha": result.alpha,
                "initial_capital": result.initial_capital,
                "final_capital": result.final_capital,
                "equity_curve": [
                    {"date": d.strftime("%Y-%m-%d"), "value": round(v, 2)}
                    for d, v in result.equity_curve.items()
                ],
            },
        }
    except Exception as e:
        _jobs[job_id] = {"status": "error", "error": str(e)}


@router.post("/backtest/run")
def run_backtest(params: BacktestParams):
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "running"}
    t = threading.Thread(target=_run_backtest_job, args=(job_id, params), daemon=True)
    t.start()
    return {"job_id": job_id, "status": "running"}


@router.get("/backtest/result/{job_id}")
def get_backtest_result(job_id: str):
    if job_id not in _jobs:
        return {"status": "not_found"}
    return _jobs[job_id]


@router.get("/backtest/history")
def get_backtest_history():
    path = RESULTS_DIR / "version_history.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path)
    return df.to_dict("records")
