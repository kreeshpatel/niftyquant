"""
Claude Memory System for NiftyQuant.
Builds accumulated learnings from trade outcomes to include in signal analysis prompts.
Self-improving: memory grows with each closed trade.
"""

import json
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent / "results"
MEMORY_PATH = RESULTS_DIR / "claude_memory.json"


def _load_memory() -> dict:
    if MEMORY_PATH.exists():
        with open(MEMORY_PATH) as f:
            return json.load(f)
    return {"sectors": {}, "tickers": {}}


def _save_memory(memory: dict):
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(MEMORY_PATH, "w") as f:
        json.dump(memory, f, indent=2)


def build_context(ticker: str, sector: str) -> str:
    """
    Build accumulated learnings to include in every Claude prompt.
    Returns a string of relevant memory for the given ticker/sector.
    """
    memory = _load_memory()
    insights = []

    # Sector-specific memory
    sector_memory = memory.get("sectors", {}).get(sector, {})
    if sector_memory and sector_memory.get("trades", 0) >= 3:
        parts = [f"Memory - {sector} sector: win rate {sector_memory['win_rate']:.0f}% over {sector_memory['trades']} trades"]
        if sector_memory.get("best_rsi_entry"):
            parts.append(f"best entry RSI < {sector_memory['best_rsi_entry']}")
        if sector_memory.get("avoid_condition"):
            parts.append(f"avoid: {sector_memory['avoid_condition']}")
        insights.append(", ".join(parts))

    # Ticker-specific memory
    ticker_memory = memory.get("tickers", {}).get(ticker, {})
    if ticker_memory and ticker_memory.get("trades", 0) >= 2:
        parts = [f"Memory - {ticker}: {ticker_memory['trades']} past trades, {ticker_memory['win_rate']:.0f}% WR"]
        if ticker_memory.get("note"):
            parts.append(f"note: {ticker_memory['note']}")
        if ticker_memory.get("avg_return"):
            parts.append(f"avg return: {ticker_memory['avg_return']:+.1f}%")
        insights.append(", ".join(parts))

    return "\n".join(insights)


def update_memory(trade: dict, analysis: dict = None):
    """
    After each trade closes, update memory with outcome data.
    Tracks per-ticker and per-sector win rates and patterns.
    """
    memory = _load_memory()

    ticker = trade.get("ticker", "")
    sector = trade.get("sector", "Unknown")
    won = trade.get("return_pct", 0) > 0
    return_pct = trade.get("return_pct", 0)

    # Update ticker memory
    if ticker not in memory["tickers"]:
        memory["tickers"][ticker] = {
            "trades": 0, "wins": 0, "total_return": 0, "note": "",
        }
    t = memory["tickers"][ticker]
    t["trades"] += 1
    t["wins"] += 1 if won else 0
    t["win_rate"] = t["wins"] / t["trades"] * 100
    t["total_return"] = t.get("total_return", 0) + return_pct
    t["avg_return"] = t["total_return"] / t["trades"]

    # Add lesson from analysis if available
    if analysis and analysis.get("lesson"):
        t["note"] = analysis["lesson"][:120]

    # Update sector memory
    if sector not in memory["sectors"]:
        memory["sectors"][sector] = {
            "trades": 0, "wins": 0, "total_return": 0,
        }
    s = memory["sectors"][sector]
    s["trades"] += 1
    s["wins"] += 1 if won else 0
    s["win_rate"] = s["wins"] / s["trades"] * 100
    s["total_return"] = s.get("total_return", 0) + return_pct
    s["avg_return"] = s["total_return"] / s["trades"]

    # Track best entry RSI for winning trades in the sector
    if won and trade.get("entry_rsi"):
        best_rsi = s.get("best_rsi_entry", 100)
        if trade["entry_rsi"] < best_rsi:
            s["best_rsi_entry"] = trade["entry_rsi"]

    _save_memory(memory)


def get_veto_accuracy(decisions_path: Path = None) -> dict:
    """
    Calculate how accurate Claude's SKIP decisions were.
    Compares vetoed signals against what actually happened.
    """
    if decisions_path is None:
        decisions_path = RESULTS_DIR / "claude_decisions.json"

    if not decisions_path.exists():
        return {"vetoed": 0, "would_have_lost": 0, "accuracy": 0, "saved": 0}

    with open(decisions_path) as f:
        decisions = json.load(f)

    vetoed = [d for d in decisions if d.get("decision") == "SKIP"]

    # We can't know the actual outcome of vetoed trades,
    # but we can estimate from the reasoning and confidence
    # For now, return the raw count
    return {
        "vetoed": len(vetoed),
        "total_reviewed": len(decisions),
        "approved": len([d for d in decisions if d.get("decision") == "APPROVE"]),
        "reduced": len([d for d in decisions if d.get("decision") == "REDUCE"]),
        "avg_confidence": sum(d.get("confidence", 50) for d in decisions) / max(len(decisions), 1),
    }
