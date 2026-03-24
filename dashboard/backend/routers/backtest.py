"""Backtest API — returns history (running requires local src/)."""

import os
from fastapi import APIRouter

from config import RESULTS_DIR

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
        import pandas as pd
        path = os.path.join(RESULTS_DIR, "version_history.csv")
        if os.path.exists(path):
            df = pd.read_csv(path)
            return df.to_dict("records")
    except Exception:
        pass
    return []
