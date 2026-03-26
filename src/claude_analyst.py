"""
Claude AI Intelligence Layer for NiftyQuant.
4 roles: Signal Analyst, Position Monitor, Trade Reviewer, Strategy Advisor.
"""

import json
from datetime import datetime
from pathlib import Path

import anthropic

client = anthropic.Anthropic()

RESULTS_DIR = Path(__file__).parent.parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════
# MODULE 1 — Signal Analyst
# ═══════════════════════════════════════════════════

def analyse_signal(signal: dict,
                   features: dict,
                   portfolio_state: dict,
                   regime: dict) -> dict:
    """
    Claude reviews a signal before entry.
    Returns: decision, confidence, size_multiplier, reasoning
    """
    # Build memory context
    try:
        from claude_memory import build_context
        memory_context = build_context(
            signal['ticker'], signal.get('sector', 'Unknown'))
    except Exception:
        memory_context = ""

    prompt = f"""You are a quantitative analyst reviewing a trade signal for NiftyQuant, an NSE algorithmic trading engine.

SIGNAL DETAILS:
  Ticker: {signal['ticker']}
  Sector: {signal.get('sector', 'Unknown')}
  Entry price: ₹{signal.get('entry_price', 0):.2f}
  Stop loss: ₹{signal.get('stop_price', 0):.2f}
  Target: ₹{signal.get('target_price', 0):.2f}
  R:R ratio: {signal.get('rr_ratio', 0):.2f}
  ML score: {signal.get('ml_score', 0):.3f}
  Hold days expected: {signal.get('hold_days', 10)}
  Risk amount: ₹{signal.get('risk_amount', 0):.0f}

TECHNICAL INDICATORS (latest):
  RSI(14): {features.get('rsi_14', 'N/A')}
  MACD histogram: {features.get('macd_histogram', 'N/A')}
  ADX(14): {features.get('adx_14', 'N/A')}
  BB%: {features.get('bb_pct', 'N/A')}
  Volume ratio: {features.get('volume_ratio', 'N/A')}
  EMA9 > EMA21: {features.get('ema_9_above_21', 'N/A')}
  Position in 52w range: {features.get('position_in_52w', 'N/A')}
  Return last 20 days: {features.get('return_20d', 'N/A')}
  Dip count: {features.get('dip_count', 'N/A')}
  Dip conviction: {features.get('dip_conviction', 'N/A')}

MARKET CONTEXT:
  Regime: {regime.get('regime', 'UNKNOWN')}
  Breadth: {regime.get('breadth', 0):.1f}%
  Nifty RSI: {regime.get('nifty_rsi', 0):.1f}
  India VIX: {regime.get('vix', 0):.1f}
  Nifty ADX: {regime.get('nifty_adx', 0):.1f}

PORTFOLIO STATE:
  Open positions: {portfolio_state.get('open_positions', 0)}
  Capital deployed: {portfolio_state.get('deployed_pct', 0):.1f}%
  Cash available: ₹{portfolio_state.get('cash', 0):.0f}
  Today's P&L: ₹{portfolio_state.get('today_pnl', 0):.0f}
  Current drawdown: {portfolio_state.get('current_drawdown', 0):.1f}%

STRATEGY PERFORMANCE (last 30 trades):
  Win rate: {portfolio_state.get('recent_win_rate', 0):.1f}%
  Profit factor: {portfolio_state.get('recent_pf', 0):.2f}
  {signal.get('sector', 'Unknown')} sector win rate: {portfolio_state.get('sector_wr', {}).get(signal.get('sector', ''), 'unknown')}
"""
    if memory_context:
        prompt += f"\nACCUMULATED MEMORY:\n{memory_context}\n"

    prompt += """
Analyse this signal and respond in this EXACT JSON format (no other text):
{
  "decision": "APPROVE" or "REDUCE" or "SKIP",
  "confidence": 0-100,
  "size_multiplier": 0.5-1.5,
  "reasoning": "2-3 sentences explaining decision",
  "key_concerns": ["concern1", "concern2"],
  "key_positives": ["positive1", "positive2"],
  "watch_for": "what to monitor if approved"
}

Rules for decision:
- APPROVE: signal looks good, enter at normal/increased size
- REDUCE: signal has merit but some concerns, enter at 0.5-0.75x size
- SKIP: concerns outweigh positives, do not enter
- Be specific about numbers in reasoning
- Consider sector performance history
- Consider current regime and portfolio heat"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        result = json.loads(response_text)

        # Save to log
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "ticker": signal['ticker'],
            "signal_type": "entry",
            "ml_score": signal.get('ml_score', 0),
            "decision": result['decision'],
            "confidence": result['confidence'],
            "size_multiplier": result.get('size_multiplier', 1.0),
            "reasoning": result['reasoning'],
            "key_concerns": result.get('key_concerns', []),
            "key_positives": result.get('key_positives', []),
            "watch_for": result.get('watch_for', ''),
        }

        log_path = RESULTS_DIR / "claude_decisions.json"
        if log_path.exists():
            with open(log_path) as f:
                log = json.load(f)
        else:
            log = []
        log.append(log_entry)
        log = log[-500:]
        with open(log_path, "w") as f:
            json.dump(log, f, indent=2)

        return result

    except Exception as e:
        print(f"  Claude analysis failed: {e}")
        return {
            "decision": "APPROVE",
            "confidence": 50,
            "size_multiplier": 1.0,
            "reasoning": f"Analysis unavailable: {str(e)[:80]}",
            "key_concerns": [],
            "key_positives": [],
            "watch_for": "",
        }


# ═══════════════════════════════════════════════════
# MODULE 2 — Position Monitor
# ═══════════════════════════════════════════════════

def monitor_positions(positions: list,
                      regime: dict,
                      feature_data: dict) -> list:
    """
    Reviews all open positions daily.
    Returns list of alerts/recommendations.
    """
    if not positions:
        return []

    alerts = []

    for pos in positions:
        ticker = pos['ticker']
        features = feature_data.get(ticker, feature_data.get(ticker + '.NS', {}))

        prompt = f"""Review this open trading position and give a brief recommendation.

Position: {ticker} ({pos.get('sector', 'Unknown')})
Entry: ₹{pos.get('entry_price', 0):.2f} on {pos.get('entry_date', 'N/A')}
Current: ₹{pos.get('current_price', 0):.2f}
Stop: ₹{pos.get('stop_price', pos.get('atr_stop', 0)):.2f}
Target: ₹{pos.get('target_price', 0):.2f}
Days held: {pos.get('days_held', 0)} (min hold: 8 days)
Current P&L: {pos.get('current_pnl_pct', 0):+.1f}%
Buffer to stop: {pos.get('buffer_to_stop_pct', 0):.1f}%

Current technicals:
  RSI: {features.get('rsi_14', 'N/A')}
  EMA9>EMA21: {features.get('ema_9_above_21', 'N/A')}
  Volume ratio: {features.get('volume_ratio', 'N/A')}
  MACD: {features.get('macd_histogram', 'N/A')}

Market regime: {regime.get('regime', 'UNKNOWN')} (breadth {regime.get('breadth', 0):.1f}%)

Respond in JSON only:
{{
  "status": "HOLD" or "WATCH" or "EXIT_CONSIDER",
  "alert_level": "green" or "amber" or "red",
  "message": "one sentence recommendation",
  "reason": "specific technical reason"
}}"""

        try:
            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            text = msg.content[0].text.strip()
            text = text.replace('```json', '').replace('```', '').strip()
            result = json.loads(text)
            result['ticker'] = ticker
            alerts.append(result)
        except Exception:
            pass

    # Save alerts
    alerts_path = RESULTS_DIR / "claude_alerts.json"
    with open(alerts_path, "w") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "alerts": alerts,
        }, f, indent=2)

    return alerts


# ═══════════════════════════════════════════════════
# MODULE 3 — Post-trade Reviewer
# ═══════════════════════════════════════════════════

def review_closed_trade(trade: dict,
                        entry_features: dict,
                        exit_features: dict) -> dict:
    """
    After a trade closes, Claude reviews what happened and extracts lessons.
    """
    outcome = "WIN" if trade.get('return_pct', 0) > 0 else "LOSS"

    prompt = f"""A trade just closed. Analyse what happened and extract lessons.

TRADE SUMMARY:
  Ticker: {trade['ticker']} ({trade.get('sector', 'Unknown')})
  Outcome: {outcome} ({trade.get('return_pct', 0):+.1f}%)
  Entry: ₹{trade.get('entry_price', 0):.2f} on {trade.get('entry_date', 'N/A')}
  Exit: ₹{trade.get('exit_price', 0):.2f} on {trade.get('exit_date', 'N/A')}
  Exit reason: {trade.get('exit_reason', 'unknown')}
  Days held: {trade.get('hold_days', 0)}
  Net P&L: ₹{trade.get('net_pnl', 0):.0f}

INDICATORS AT ENTRY:
  RSI: {entry_features.get('rsi_14', 'N/A')}
  ADX: {entry_features.get('adx_14', 'N/A')}
  ML score: {trade.get('signal_score', trade.get('ml_score', 'N/A'))}
  Volume ratio: {entry_features.get('volume_ratio', 'N/A')}
  BB%: {entry_features.get('bb_pct', 'N/A')}
  Dip conviction: {entry_features.get('dip_conviction', 'N/A')}
  Position in 52w: {entry_features.get('position_in_52w', 'N/A')}

INDICATORS AT EXIT:
  RSI: {exit_features.get('rsi_14', 'N/A')}
  ADX: {exit_features.get('adx_14', 'N/A')}

Respond in JSON only:
{{
  "what_worked": "what the entry signal got right",
  "what_failed": "what went wrong or was missed",
  "lesson": "one specific actionable lesson",
  "parameter_suggestion": {{
    "parameter": "name of parameter to adjust",
    "current": "current value",
    "suggested": "suggested value",
    "reason": "why this change would help"
  }},
  "pattern_tag": "one word describing this trade type"
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = msg.content[0].text.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        result = json.loads(text)

        # Save to trade reviews log
        review = {
            "timestamp": datetime.now().isoformat(),
            "ticker": trade['ticker'],
            "outcome": outcome,
            "return_pct": trade.get('return_pct', 0),
            "exit_reason": trade.get('exit_reason', 'unknown'),
            **result,
        }

        reviews_path = RESULTS_DIR / "claude_trade_reviews.json"
        if reviews_path.exists():
            with open(reviews_path) as f:
                reviews = json.load(f)
        else:
            reviews = []
        reviews.append(review)
        reviews = reviews[-200:]
        with open(reviews_path, "w") as f:
            json.dump(reviews, f, indent=2)

        return result
    except Exception as e:
        return {"lesson": str(e), "pattern_tag": "error"}


# ═══════════════════════════════════════════════════
# MODULE 4 — Weekly Strategy Advisor
# ═══════════════════════════════════════════════════

def weekly_strategy_review(recent_trades: list,
                           claude_decisions: list,
                           current_params: dict) -> dict:
    """
    Weekly review of strategy performance.
    Claude suggests parameter improvements.
    """
    import pandas as pd

    wins = [t for t in recent_trades if t.get('return_pct', 0) > 0]
    losses = [t for t in recent_trades if t.get('return_pct', 0) <= 0]
    n_trades = len(recent_trades) or 1

    # Claude veto stats
    vetoed = [d for d in claude_decisions if d.get('decision') == 'SKIP']
    approved = [d for d in claude_decisions if d.get('decision') == 'APPROVE']

    # Sector performance
    sector_stats = {}
    for t in recent_trades:
        s = t.get('sector', 'Unknown')
        if s not in sector_stats:
            sector_stats[s] = {'wins': 0, 'total': 0}
        sector_stats[s]['total'] += 1
        if t.get('return_pct', 0) > 0:
            sector_stats[s]['wins'] += 1

    sector_wr = {
        s: f"{v['wins']/v['total']*100:.0f}% ({v['total']} trades)"
        for s, v in sector_stats.items() if v['total'] >= 3
    }

    # Exit reason breakdown
    exit_reasons = {}
    for t in recent_trades:
        r = t.get('exit_reason', 'unknown')
        exit_reasons[r] = exit_reasons.get(r, 0) + 1

    avg_win = sum(t['return_pct'] for t in wins) / max(len(wins), 1)
    avg_loss = sum(t['return_pct'] for t in losses) / max(len(losses), 1)
    pf = abs(sum(t['return_pct'] for t in wins)) / max(abs(sum(t['return_pct'] for t in losses)), 0.01)

    prompt = f"""You are the chief quant analyst for NiftyQuant. Review last week's performance and suggest strategy improvements.

PERFORMANCE (last {len(recent_trades)} trades):
  Win rate: {len(wins)/n_trades*100:.1f}%
  Avg win: {avg_win:.1f}%
  Avg loss: {avg_loss:.1f}%
  Profit factor: {pf:.2f}

SECTOR WIN RATES:
{json.dumps(sector_wr, indent=2)}

EXIT REASON BREAKDOWN:
{json.dumps(exit_reasons, indent=2)}

CLAUDE DECISION ACCURACY:
  Total signals reviewed: {len(claude_decisions)}
  Approved: {len(approved)}
  Vetoed (skipped): {len(vetoed)}

CURRENT PARAMETERS:
  ADX threshold: {current_params.get('adx_threshold', 22)}
  ML threshold BULL: {current_params.get('ml_threshold_bull', 0.50)}
  ML threshold CHOPPY: {current_params.get('ml_threshold_choppy', 0.54)}
  ATR stop mult: {current_params.get('atr_stop_mult', 1.5)}
  ATR target mult: {current_params.get('atr_target_mult', 3.0)}
  Min hold days: {current_params.get('min_hold_days', 8)}
  Blocked sectors: {current_params.get('blocked_sectors', [])}

Respond in JSON only:
{{
  "overall_assessment": "one sentence on strategy health",
  "top_insight": "most important pattern observed",
  "recommendations": [
    {{
      "parameter": "parameter name",
      "action": "INCREASE/DECREASE/ADD/REMOVE",
      "current": "current value",
      "suggested": "new value",
      "expected_impact": "what this change should do",
      "confidence": 0-100
    }}
  ],
  "sector_insights": {{
    "add_to_blocked": ["sectors performing poorly"],
    "remove_from_blocked": ["sectors recovering"]
  }},
  "focus_for_next_week": "one specific thing to watch"
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        text = msg.content[0].text.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        result = json.loads(text)

        # Save
        advice_path = RESULTS_DIR / "claude_strategy_advice.json"
        advice = {
            "generated_at": datetime.now().isoformat(),
            "trades_analysed": len(recent_trades),
            **result,
        }
        with open(advice_path, "w") as f:
            json.dump(advice, f, indent=2)

        print("\n  Claude Strategy Review:")
        print(f"    {result['overall_assessment']}")
        print(f"\n    Top insight: {result['top_insight']}")
        print(f"\n    Recommendations:")
        for r in result.get('recommendations', []):
            print(f"      {r['parameter']}: {r['current']} -> {r['suggested']}")
            print(f"      ({r['expected_impact']})")

        return result
    except Exception as e:
        print(f"  Weekly review failed: {e}")
        return {}
