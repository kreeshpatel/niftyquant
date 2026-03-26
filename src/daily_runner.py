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

# Claude AI integration (graceful if unavailable)
try:
    from claude_analyst import (
        analyse_signal, monitor_positions,
        review_closed_trade, weekly_strategy_review,
    )
    from claude_memory import update_memory
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False

ensure_dirs()


def _is_trading_day(dt: datetime) -> bool:
    if dt.weekday() >= 5:
        return False
    return dt.strftime("%Y-%m-%d") not in NSE_HOLIDAYS


def run_daily():
    today = datetime.now()
    print(f"\n{'='*55}")
    print(f"  NiftyQuant · Production Strategy v3.0")
    print(f"  Backtest: +43.2% · Sharpe 0.67 · -24.1% DD")
    print(f"  {today.strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*55}")

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

    # Step 3b — Adaptive engine scan
    print("\n  Step 3b: Running adaptive engine (bandit + optimizer + online ML)...")
    import json as _json
    from adaptive_engine import AdaptiveEngine, print_adaptive_plans

    engine = AdaptiveEngine()
    status = engine.get_engine_status()
    print(f"  Active model: {status['active_model']} (AUC: {status['model_auc']:.3f})")
    params = status["current_params"]
    print(f"  Params: ADX>{params.get('adx_threshold', 25)} "
          f"RSI<{params.get('rsi_dip_level', 40)} "
          f"Stop={params.get('atr_stop_mult', 1.5)}xATR")
    print(f"  Next optimization in: {status['next_optimization_in']}")

    adaptive_plans = engine.run_daily(
        portfolio_value=INITIAL_CAPITAL,
        open_positions=[],
        regime="BULL",  # will be overridden by regime detection below
    )
    print(f"  Adaptive plans generated: {len(adaptive_plans)}")

    if adaptive_plans:
        print_adaptive_plans(adaptive_plans)

    # Convert adaptive plans to signals JSON
    hybrid_signals_json = []
    for p in adaptive_plans:
        hybrid_signals_json.append({
            "ticker": p["ticker"],
            "conviction": p["conviction"],
            "dip_reason": p["dip_reason"],
            "entry": p["entry"],
            "stop": p["stop"],
            "target": p["target"],
            "stop_pct": p["stop_pct"],
            "target_pct": p["target_pct"],
            "rr": p["rr"],
            "shares": p["shares"],
            "capital": p["position_value"],
            "hold_days": p["hold_days"],
            "expected_value_pct": p["expected_value_pct"],
            "strategy": "ADAPTIVE",
            "ml_score": p.get("ml_score", 0),
            "size_multiplier": p.get("size_multiplier", 1.0),
        })

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

    # Step 7 — ML signal scan and entries
    n_entries = 0
    n_signals = 0
    ml_signals_json = []
    if regime != "BEAR" and not circuit_active:
        print("\n  Step 7: Scanning for ML entry signals (MOMENTUM_CROSSOVER)...")
        signals = pt.scan_signals(regime=regime)
        n_signals = len(signals)
        print(f"  ML signals found: {n_signals} candidates")

        for sig in signals:
            print(f"    {sig.ticker}: ML={sig.ml_score:.3f} | "
                  f"Entry={sig.entry_price:.2f} | Sector={sig.sector}")

            ml_signals_json.append({
                "ticker": sig.ticker,
                "conviction": "ML",
                "dip_reason": f"ML score {sig.ml_score:.3f}",
                "entry": round(sig.entry_price, 2),
                "stop": round(sig.atr_stop, 2),
                "target": 0,
                "stop_pct": 0,
                "target_pct": 0,
                "rr": 0,
                "shares": 0,
                "capital": 0,
                "hold_days": 10,
                "expected_value_pct": 0,
                "strategy": "MOMENTUM_CROSSOVER",
            })

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
        print("\n  Step 7: BEAR regime — skipping ML signal scan.")

    # Save combined signals (hybrid + ML) to signals_today.json
    all_signals = hybrid_signals_json + ml_signals_json
    signals_path = RESULTS_DIR / "signals_today.json"
    with open(signals_path, "w") as f:
        _json.dump(all_signals, f, indent=2)
    print(f"\n  Saved {len(all_signals)} signals -> {signals_path}")
    print(f"    HYBRID_DIP: {len(hybrid_signals_json)} | MOMENTUM_CROSSOVER: {len(ml_signals_json)}")

    # Step 7b — Claude AI signal analysis
    if CLAUDE_AVAILABLE and all_signals:
        print("\n  Step 7b: Claude AI signal analysis...")
        regime_data = {
            "regime": regime,
            "breadth": regime_result.breadth_ratio * 100,
            "nifty_rsi": regime_result.rsi_signal,
            "vix": regime_result.vix_level,
            "nifty_adx": 0,
        }
        portfolio_state = {
            "open_positions": summary["open_positions"],
            "deployed_pct": (1 - summary["cash"] / summary["total_value"]) * 100 if summary["total_value"] > 0 else 0,
            "cash": summary["cash"],
            "today_pnl": 0,
            "current_drawdown": summary["drawdown_pct"],
            "recent_win_rate": 39.8,
            "recent_pf": 1.19,
            "sector_wr": {},
        }
        for sig_json in all_signals:
            sig_for_claude = {
                "ticker": sig_json["ticker"],
                "sector": get_sector(sig_json["ticker"]),
                "entry_price": sig_json.get("entry", 0),
                "stop_price": sig_json.get("stop", 0),
                "target_price": sig_json.get("target", 0),
                "rr_ratio": sig_json.get("rr", 0),
                "ml_score": sig_json.get("ml_score", 0),
                "hold_days": sig_json.get("hold_days", 10),
                "risk_amount": 0,
            }
            features_for_claude = {}  # features already consumed by ML
            try:
                analysis = analyse_signal(
                    signal=sig_for_claude,
                    features=features_for_claude,
                    portfolio_state=portfolio_state,
                    regime=regime_data,
                )
                decision = analysis.get("decision", "APPROVE")
                conf = analysis.get("confidence", 50)
                icon = {"APPROVE": "+", "REDUCE": "~", "SKIP": "x"}.get(decision, "?")
                print(f"    [{icon}] {sig_json['ticker']}: {decision} ({conf}% confidence)")
                print(f"        {analysis.get('reasoning', '')[:100]}")
                sig_json["claude_decision"] = decision
                sig_json["claude_confidence"] = conf
                sig_json["claude_reasoning"] = analysis.get("reasoning", "")
                sig_json["claude_size_mult"] = analysis.get("size_multiplier", 1.0)
            except Exception as e:
                print(f"    [?] {sig_json['ticker']}: Claude unavailable ({e})")

        # Re-save signals with Claude annotations
        with open(signals_path, "w") as f:
            _json.dump(all_signals, f, indent=2)

    # Step 7c — Claude position monitoring
    if CLAUDE_AVAILABLE and summary.get("positions"):
        print("\n  Step 7c: Claude position monitoring...")
        open_pos_list = []
        for ticker, pos in summary["positions"].items():
            hold = (datetime.now() - datetime.fromisoformat(pos["entry_date"])).days
            open_pos_list.append({
                "ticker": ticker,
                "sector": get_sector(ticker),
                "entry_price": pos["entry_price"],
                "current_price": pos["current_price"],
                "stop_price": pos.get("atr_stop", 0),
                "target_price": 0,
                "entry_date": pos["entry_date"],
                "days_held": hold,
                "current_pnl_pct": pos.get("unrealised_pnl_pct", 0),
                "buffer_to_stop_pct": ((pos["current_price"] - pos.get("atr_stop", 0)) / pos["current_price"] * 100) if pos["current_price"] > 0 else 0,
            })
        regime_data = {
            "regime": regime,
            "breadth": regime_result.breadth_ratio * 100,
        }
        try:
            alerts = monitor_positions(open_pos_list, regime_data, {})
            for alert in alerts:
                level = alert.get("alert_level", "green")
                icon = {"green": "[OK]", "amber": "[!!]", "red": "[XX]"}.get(level, "[??]")
                print(f"    {icon} {alert.get('ticker', '?')}: {alert.get('message', '')}")
        except Exception as e:
            print(f"    Claude monitoring unavailable: {e}")

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

    # Step 8b — Claude trade reviews for exits
    if CLAUDE_AVAILABLE and n_exits > 0:
        print("\n  Step 8b: Claude reviewing closed trades...")
        for ex in exits:
            trade_data = pt.exit_position(ex["ticker"], ex["reason"], ex.get("exit_price"))
            if trade_data is None:
                continue
            trade_for_review = {
                "ticker": ex["ticker"],
                "sector": get_sector(ex["ticker"]),
                "entry_price": trade_data.get("entry_price", 0),
                "exit_price": trade_data.get("exit_price", 0),
                "entry_date": trade_data.get("entry_date", ""),
                "exit_date": trade_data.get("exit_date", ""),
                "exit_reason": trade_data.get("exit_reason", "unknown"),
                "hold_days": trade_data.get("hold_days", 0),
                "return_pct": trade_data.get("return_pct", 0),
                "net_pnl": trade_data.get("net_pnl", 0),
            }
            try:
                review = review_closed_trade(trade_for_review, {}, {})
                update_memory(trade_for_review, review)
                tag = review.get("pattern_tag", "")
                print(f"    {ex['ticker']}: {review.get('lesson', '')[:80]} [{tag}]")
            except Exception as e:
                print(f"    {ex['ticker']}: Review failed ({e})")

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

    # Strategy health check
    print(f"\n  Strategy health check:")
    print(f"    Model: {status.get('active_model', 'base_v2')} "
          f"(AUC {status.get('model_auc', 0):.3f})")
    print(f"    Regime: {regime}")
    print(f"    Next optimizer: {status.get('next_optimization_in', 'N/A')}")
    print(f"    Blocked sectors: IT, FMCG, Auto")
    print(f"    Priority sectors: Infra, Energy, Metals, Consumer")

    # Step 13 — Weekly Claude strategy review (Mondays)
    if CLAUDE_AVAILABLE and today.weekday() == 0:
        print("\n  Step 13: Running weekly Claude strategy review...")
        try:
            trades_csv = RESULTS_DIR / "paper_trades.csv"
            if trades_csv.exists():
                trades_df = pd.read_csv(trades_csv)
                recent = trades_df.tail(30).to_dict("records")
            else:
                recent = []

            decisions_path = RESULTS_DIR / "claude_decisions.json"
            if decisions_path.exists():
                with open(decisions_path) as f:
                    decisions = _json.load(f)
            else:
                decisions = []

            prod_path = RESULTS_DIR / "production_strategy.json"
            if prod_path.exists():
                with open(prod_path) as f:
                    prod = _json.load(f)
                params_for_review = prod.get("parameters", {})
            else:
                params_for_review = {}

            weekly_strategy_review(
                recent_trades=recent,
                claude_decisions=decisions[-50:],
                current_params=params_for_review,
            )
        except Exception as e:
            print(f"    Weekly review failed: {e}")

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
