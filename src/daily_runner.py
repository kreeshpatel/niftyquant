"""
Phase 5: Daily Runner
Orchestrates the full daily trading cycle.
Run: python src/daily_runner.py
Schedule: python src/daily_runner.py --schedule
"""

import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    RESULTS_DIR, INITIAL_CAPITAL, REGIME_BEAR_BLOCK,
    NSE_HOLIDAYS, ensure_dirs, get_sector,
)

ensure_dirs()


def _is_trading_day(dt: datetime) -> bool:
    if dt.weekday() >= 5:
        return False
    return dt.strftime("%Y-%m-%d") not in NSE_HOLIDAYS


def run_daily():
    today = datetime.now()
    print(f"\n{'='*70}")
    print(f"  === Daily Runner: {today.strftime('%Y-%m-%d %H:%M')} ===")
    print(f"{'='*70}")

    # Step 1 — Market check
    if not _is_trading_day(today):
        reason = "weekend" if today.weekday() >= 5 else "NSE holiday"
        print(f"\n  Market closed ({reason}). Exiting.")
        return

    # Step 2 — Data update
    print("\n  Step 2: Updating market data...")
    from data_fetcher import DataFetcher
    fetcher = DataFetcher()
    report = fetcher.update_all(force=False)
    ok = (report["Status"] == "OK").sum() if len(report) > 0 else 0
    print(f"  Data updated. {ok} stocks current.")

    # Step 3 — Feature recompute
    print("\n  Step 3: Recomputing features...")
    from feature_engineer import FeatureEngineer
    fe = FeatureEngineer()
    fe.compute_all(force=False)

    # Step 4 — Regime detection
    print("\n  Step 4: Detecting market regime...")
    from regime_detector import RegimeDetector
    detector = RegimeDetector()
    regime_result = detector.detect()
    regime = regime_result.regime
    print(f"  Market Regime: {regime} (confidence: {regime_result.confidence:.0%})")
    print(f"  VIX: {regime_result.vix_level} | Breadth: {regime_result.breadth_ratio:.1%} | "
          f"Nifty RSI: {regime_result.rsi_signal}")

    # Step 5 — Auto-retrain check
    print("\n  Step 5: Checking ML model freshness...")
    from ml_model import MLModel
    ml = MLModel()
    ml.ensure_current()

    # Step 6 — Circuit breaker check
    print("\n  Step 6: Checking circuit breaker...")
    from paper_trader import PaperTrader
    pt = PaperTrader()
    pt.update_prices()
    summary = pt.get_portfolio_summary()

    from risk_manager import RiskManager
    rm = RiskManager(
        portfolio_value=summary["total_value"],
        open_positions=list(pt.state["positions"].values()),
    )

    circuit_active = rm.is_circuit_breaker_active()
    if circuit_active:
        print("  CIRCUIT BREAKER ACTIVE. No new entries today.")

    # Step 7 — Signal scan and entries
    n_entries = 0
    n_signals = 0
    if regime != "BEAR" and not circuit_active:
        print("\n  Step 7: Scanning for entry signals...")
        signals = pt.scan_signals(regime=regime)
        n_signals = len(signals)
        print(f"  Signals found: {n_signals} candidates")

        for sig in signals:
            print(f"    {sig.ticker}: ML={sig.ml_score:.3f} | "
                  f"Entry={sig.entry_price:.2f} | Sector={sig.sector}")

            decision = rm.can_enter(
                ticker=sig.ticker, sector=sig.sector,
                ml_score=sig.ml_score, regime=regime,
                entry_price=sig.entry_price,
                atr=sig.entry_price - sig.atr_stop,
                available_cash=pt.state["cash"],
            )

            if decision.allowed:
                success = pt.enter_position(sig, decision)
                if success:
                    pos = pt.state["positions"].get(sig.ticker, {})
                    print(f"    -> ENTERED {sig.ticker} at Rs {pos.get('entry_price', 0):.2f} | "
                          f"Size: Rs {pos.get('position_size', 0):,.0f} | "
                          f"Stop: Rs {sig.atr_stop:.2f}")
                    n_entries += 1
            else:
                print(f"    -> BLOCKED: {decision.reason}")
    elif regime == "BEAR":
        print("\n  Step 7: BEAR regime — skipping signal scan.")

    # Step 8 — Scan exits
    print("\n  Step 8: Scanning for exits...")
    exits = pt.scan_exits()
    n_exits = 0
    for ex in exits:
        trade = pt.exit_position(ex["ticker"], ex["reason"], ex.get("exit_price"))
        if trade:
            print(f"    EXIT {trade['ticker']}: {trade['exit_reason']} | "
                  f"P&L: {trade['return_pct']:+.1f}% | Held: {trade['hold_days']}d")
            n_exits += 1

    # Step 9 — Update prices
    pt.update_prices()
    summary = pt.get_portfolio_summary()

    # Step 10 — Daily report
    eq = "=" * 46
    ln = "-" * 46
    print(f"\n  +{eq}+")
    print(f"  |{'PAPER PORTFOLIO — ' + today.strftime('%Y-%m-%d'):^46}|")
    print(f"  +{eq}+")
    print(f"  | Total Value   : Rs {summary['total_value']:>12,.0f}{' '*12}|")
    print(f"  | Cash          : Rs {summary['cash']:>12,.0f}{' '*12}|")
    print(f"  | Invested      : Rs {summary['invested_value']:>12,.0f}{' '*12}|")
    print(f"  +{ln}+")
    print(f"  | Total Return  : {summary['total_return_pct']:>+10.1f}%{' '*17}|")
    print(f"  | Drawdown      : {summary['drawdown_pct']:>10.1f}%{' '*17}|")
    print(f"  +{ln}+")
    print(f"  | Open Positions: {summary['open_positions']:>10}{' '*18}|")
    print(f"  | Regime        : {regime:>10}{' '*18}|")
    print(f"  +{eq}+")

    if summary["positions"]:
        print(f"\n  {'Ticker':<12} {'Entry':>8} {'Current':>8} {'P&L%':>7} {'Days':>5} {'Stop':>8}")
        print(f"  {'-'*52}")
        for ticker, pos in summary["positions"].items():
            hold = (datetime.now() - datetime.fromisoformat(pos["entry_date"])).days
            print(f"  {ticker:<12} {pos['entry_price']:>8.2f} {pos['current_price']:>8.2f} "
                  f"{pos['unrealised_pnl_pct']:>+6.1f}% {hold:>5} {pos['atr_stop']:>8.2f}")

    # Step 11 — Save daily snapshot
    from paper_trader import PORTFOLIO_HISTORY
    snapshot = {
        "date": today.strftime("%Y-%m-%d"),
        "total_value": summary["total_value"],
        "cash": summary["cash"],
        "invested": summary["invested_value"],
        "n_positions": summary["open_positions"],
        "total_return": summary["total_return_pct"],
        "drawdown": summary["drawdown_pct"],
        "regime": regime,
        "n_signals_today": n_signals,
        "n_entries_today": n_entries,
        "n_exits_today": n_exits,
    }
    snap_df = pd.DataFrame([snapshot])
    if PORTFOLIO_HISTORY.exists():
        snap_df.to_csv(PORTFOLIO_HISTORY, mode="a", header=False, index=False)
    else:
        snap_df.to_csv(PORTFOLIO_HISTORY, index=False)

    # Step 12 — Check drawdown circuit breaker
    equity = pd.Series([INITIAL_CAPITAL, summary["total_value"]])
    rm.check_circuit_breaker(equity)

    print(f"\n  Daily run complete.\n")


if __name__ == "__main__":
    if "--schedule" in sys.argv:
        import schedule
        import time
        schedule.every().day.at("16:15").do(run_daily)
        print("Scheduler running. Engine fires at 4:15 PM IST daily.")
        print("Press Ctrl+C to stop.")
        while True:
            schedule.run_pending()
            time.sleep(60)
    else:
        run_daily()
