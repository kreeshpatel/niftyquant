"""Trades API — trade history and stats."""

import os
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from config import RESULTS_DIR

router = APIRouter(tags=["trades"])


def _load_trades():
    import pandas as pd
    frames = []
    for name in ["trade_log.csv", "paper_trades.csv"]:
        try:
            path = os.path.join(RESULTS_DIR, name)
            if os.path.exists(path):
                df = pd.read_csv(path)
                if not df.empty:
                    frames.append(df)
        except Exception:
            pass
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


@router.get("/trades")
def get_trades(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=10, le=200),
    ticker: str = Query(""),
    start: str = Query(""),
    end: str = Query(""),
    exit_reason: str = Query(""),
):
    try:
        df = _load_trades()
        if df.empty:
            return {"trades": [], "total": 0, "page": page, "pages": 0}

        if ticker:
            df = df[df["ticker"].str.contains(ticker, case=False, na=False)]
        if start and "entry_date" in df.columns:
            df = df[df["entry_date"] >= start]
        if end and "entry_date" in df.columns:
            df = df[df["entry_date"] <= end]
        if exit_reason and "exit_reason" in df.columns:
            df = df[df["exit_reason"] == exit_reason]

        total = len(df)
        pages = (total + per_page - 1) // per_page
        start_idx = (page - 1) * per_page
        page_df = df.iloc[start_idx:start_idx + per_page]

        return {"trades": page_df.to_dict("records"), "total": total, "page": page, "pages": pages}
    except Exception:
        return {"trades": [], "total": 0, "page": page, "pages": 0}


@router.get("/trades/stats")
def get_trade_stats():
    try:
        df = _load_trades()
        if df.empty or "return_pct" not in df.columns:
            return {"total_trades": 0}

        wins = df[df["return_pct"] > 0]
        losses = df[df["return_pct"] <= 0]
        stats = {
            "total_trades": len(df),
            "win_rate": round(len(wins) / len(df) * 100, 1) if len(df) > 0 else 0,
            "avg_win": round(wins["return_pct"].mean(), 2) if len(wins) > 0 else 0,
            "avg_loss": round(losses["return_pct"].mean(), 2) if len(losses) > 0 else 0,
            "best_trade": round(df["return_pct"].max(), 2),
            "worst_trade": round(df["return_pct"].min(), 2),
            "avg_hold_days": round(df["hold_days"].mean(), 1) if "hold_days" in df.columns else 0,
        }
        if "exit_reason" in df.columns:
            stats["by_exit_reason"] = df["exit_reason"].value_counts().to_dict()
        return stats
    except Exception:
        return {"total_trades": 0}


@router.get("/trades/export")
def export_trades():
    try:
        path = os.path.join(RESULTS_DIR, "trade_log.csv")
        if os.path.exists(path):
            return FileResponse(path, media_type="text/csv", filename="trade_log.csv")
    except Exception:
        pass
    return {"error": "No trade log found"}
