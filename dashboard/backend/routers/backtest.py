"""Backtest API — returns history (running requires local src/)."""

from fastapi import APIRouter

from github_data import fetch_github_csv

router = APIRouter(tags=["backtest"])


@router.post("/backtest/run")
def run_backtest():
    return {"status": "error", "error": "Backtesting available in local mode only"}


@router.get("/backtest/result/{job_id}")
def get_backtest_result(job_id: str):
    return {"status": "not_found"}


@router.get("/backtest/history")
def get_backtest_history():
    try:
        df = fetch_github_csv("results/version_history.csv")
        if df is not None and not df.empty:
            return df.to_dict("records")
    except Exception:
        pass
    return []
