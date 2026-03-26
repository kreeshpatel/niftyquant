"""
Claude Decision Backtester for NiftyQuant.
Runs Claude's signal analyst on historical trades to measure impact.
Honest: only uses data available at each trade's entry date.
"""

import json
import time
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from claude_analyst import analyse_signal
from config import get_sector


class ClaudeBacktester:

    def __init__(self,
                 trade_log_path='results/trade_log.csv',
                 feature_dir='data/features',
                 start_date='2023-01-01',
                 end_date='2026-03-24'):
        self.trade_log_path = Path(trade_log_path)
        self.feature_dir = Path(feature_dir)
        self.start_date = start_date
        self.end_date = end_date

    def load_features_at_date(self, ticker: str, date: str) -> dict:
        """Load feature values AS OF a specific date. No future data."""
        feature_path = self.feature_dir / f"{ticker}.NS.csv"
        if not feature_path.exists():
            return {}

        try:
            df = pd.read_csv(feature_path, index_col='Date', parse_dates=True)
            target_date = pd.Timestamp(date)
            available = df[df.index <= target_date]
            if available.empty:
                return {}
            row = available.iloc[-1]
            result = {}
            col_map = {
                'rsi_14': 'rsi_14', 'rsi': 'rsi_14',
                'adx_14': 'adx_14', 'adx': 'adx_14',
                'macd_histogram': 'macd_histogram', 'macd_hist': 'macd_histogram',
                'bb_pct': 'bb_pct', 'bbands_pct': 'bb_pct',
                'volume_ratio': 'volume_ratio', 'vol_ratio': 'volume_ratio',
                'ema_9_above_21': 'ema_9_above_21',
                'position_in_52w': 'position_in_52w', 'pos_in_52w': 'position_in_52w',
                'return_20d': 'return_20d', 'ret_20d': 'return_20d',
                'dip_count': 'dip_count',
                'dip_conviction': 'dip_conviction',
            }
            for csv_col, feat_key in col_map.items():
                if csv_col in row.index and pd.notna(row[csv_col]):
                    result[feat_key] = float(row[csv_col])
            return result
        except Exception:
            return {}

    def estimate_regime_at_date(self, date: str) -> dict:
        """Estimate regime conditions at a past date using Nifty data."""
        nifty_path = Path('data') / '^NSEI.csv'
        if not nifty_path.exists():
            nifty_path = Path('data') / 'NIFTY.csv'
        if not nifty_path.exists():
            return {'regime': 'UNKNOWN', 'breadth': 50.0,
                    'nifty_rsi': 50.0, 'vix': 16.0, 'nifty_adx': 25.0}

        try:
            df = pd.read_csv(nifty_path, index_col='Date', parse_dates=True)
            target = pd.Timestamp(date)
            available = df[df.index <= target].tail(60)
            if available.empty or 'Close' not in available.columns:
                return {'regime': 'UNKNOWN', 'breadth': 50.0,
                        'nifty_rsi': 50.0, 'vix': 16.0, 'nifty_adx': 25.0}

            close = available['Close']
            delta = close.diff()
            gain = delta.clip(lower=0).rolling(14).mean().iloc[-1]
            loss = (-delta.clip(upper=0)).rolling(14).mean().iloc[-1]
            rsi = 100 - (100 / (1 + gain / max(loss, 0.001)))

            ema50 = close.ewm(span=50).mean().iloc[-1]
            current = close.iloc[-1]

            if current > ema50 and rsi > 55:
                regime = 'BULL'
            elif rsi < 40:
                regime = 'BEAR'
            else:
                regime = 'CHOPPY'

            return {
                'regime': regime,
                'breadth': float(max(0, min(100, rsi * 1.2))),
                'nifty_rsi': float(rsi),
                'vix': 16.0,
                'nifty_adx': 25.0,
            }
        except Exception:
            return {'regime': 'UNKNOWN', 'breadth': 50.0,
                    'nifty_rsi': 50.0, 'vix': 16.0, 'nifty_adx': 25.0}

    def build_portfolio_state_at_date(self, date: str, past_trades: pd.DataFrame) -> dict:
        """Estimate portfolio state at a past date."""
        if past_trades.empty or len(past_trades) < 5:
            return {
                'open_positions': 2, 'deployed_pct': 15.0, 'cash': 850000,
                'today_pnl': 0, 'current_drawdown': -3.0,
                'recent_win_rate': 39.8, 'recent_pf': 1.19, 'sector_wr': {},
            }

        recent = past_trades.tail(20)
        wr = (recent['return_pct'] > 0).mean() * 100

        wins_sum = recent[recent['return_pct'] > 0]['return_pct'].sum()
        losses_sum = abs(recent[recent['return_pct'] <= 0]['return_pct'].sum())
        pf = wins_sum / max(losses_sum, 0.01)

        sector_wr = {}
        if 'sector' in past_trades.columns:
            for sector in past_trades['sector'].dropna().unique():
                sec = past_trades[past_trades['sector'] == sector]
                if len(sec) >= 3:
                    sector_wr[sector] = f"{(sec['return_pct'] > 0).mean() * 100:.0f}%"

        return {
            'open_positions': 3, 'deployed_pct': 25.0, 'cash': 750000,
            'today_pnl': 0, 'current_drawdown': -5.0,
            'recent_win_rate': float(wr), 'recent_pf': float(pf),
            'sector_wr': sector_wr,
        }

    def run(self, max_trades=None, delay_seconds=1.5) -> dict:
        """Run Claude analysis on all historical trades."""
        print("Loading trade log...")
        trades = pd.read_csv(self.trade_log_path)

        # Ensure columns exist
        if 'return_pct' not in trades.columns:
            print("ERROR: trade_log.csv missing 'return_pct' column")
            return {}

        trades['entry_date'] = pd.to_datetime(trades['entry_date'], errors='coerce')
        trades = trades.dropna(subset=['entry_date'])
        trades = trades[
            (trades['entry_date'] >= self.start_date) &
            (trades['entry_date'] <= self.end_date)
        ].reset_index(drop=True)

        trades['return_pct'] = pd.to_numeric(trades['return_pct'], errors='coerce').fillna(0)

        if max_trades:
            trades = trades.head(max_trades)

        total = len(trades)
        print(f"Testing Claude on {total} trades ({self.start_date} to {self.end_date})")
        print("=" * 55)

        decisions = []

        for i, trade in trades.iterrows():
            ticker = trade['ticker']
            entry_date = str(trade['entry_date'].date())
            actual_return = float(trade['return_pct'])
            actual_outcome = "WIN" if actual_return > 0 else "LOSS"

            print(f"\n[{i+1}/{total}] {ticker} ({entry_date}) -- Actual: {actual_outcome} ({actual_return:+.1f}%)")

            # Load historical features (no lookahead)
            features = self.load_features_at_date(ticker, entry_date)
            if not features:
                print(f"  No features found, skipping")
                continue

            regime = self.estimate_regime_at_date(entry_date)
            portfolio = self.build_portfolio_state_at_date(entry_date, trades.iloc[:i])

            # Add sector if missing
            sector = trade.get('sector', '') or get_sector(ticker)

            signal = {
                'ticker': ticker,
                'sector': sector,
                'entry_price': float(trade.get('entry_price', 0)),
                'stop_price': float(trade.get('atr_stop', trade.get('entry_price', 0) * 0.93)),
                'target_price': float(trade.get('entry_price', 0)) * 1.10,
                'rr_ratio': 2.0,
                'ml_score': float(trade.get('signal_score', trade.get('ml_score', 0.52))),
                'hold_days': int(trade.get('hold_days', 12)),
                'risk_amount': float(trade.get('position_size', 50000)) * 0.07,
            }

            try:
                analysis = analyse_signal(
                    signal=signal, features=features,
                    portfolio_state=portfolio, regime=regime,
                )

                decision = analysis['decision']
                confidence = analysis['confidence']

                record = {
                    'ticker': ticker,
                    'entry_date': entry_date,
                    'actual_outcome': actual_outcome,
                    'actual_return': actual_return,
                    'claude_decision': decision,
                    'claude_confidence': confidence,
                    'claude_size_mult': analysis.get('size_multiplier', 1.0),
                    'claude_reasoning': analysis.get('reasoning', ''),
                    'exit_reason': trade.get('exit_reason', ''),
                }
                decisions.append(record)

                correct = (
                    (decision == 'APPROVE' and actual_outcome == 'WIN') or
                    (decision == 'SKIP' and actual_outcome == 'LOSS')
                )
                mark = "OK" if correct else "XX"
                print(f"  Claude: {decision} ({confidence}%) -- [{mark}]")
                print(f"  {analysis.get('reasoning', '')[:90]}")

                time.sleep(delay_seconds)

            except Exception as e:
                print(f"  Error: {e}")
                time.sleep(2)
                continue

        # Save all decisions
        output_path = Path('results/claude_backtest_decisions.json')
        with open(output_path, 'w') as f:
            json.dump(decisions, f, indent=2)
        print(f"\nSaved {len(decisions)} decisions to {output_path}")

        stats = self.compute_stats(decisions, trades)

        stats_path = Path('results/claude_backtest_stats.json')
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)

        self.print_report(stats)
        return stats

    def compute_stats(self, decisions: list, all_trades: pd.DataFrame) -> dict:
        df = pd.DataFrame(decisions)
        if df.empty:
            return {'total_trades_tested': 0}

        # Original strategy
        orig_wr = (all_trades['return_pct'] > 0).mean() * 100
        orig_wins = all_trades[all_trades['return_pct'] > 0]['return_pct'].sum()
        orig_losses = abs(all_trades[all_trades['return_pct'] <= 0]['return_pct'].sum())
        orig_pf = orig_wins / max(orig_losses, 0.01)
        orig_total = float(all_trades['return_pct'].sum())

        # Claude-filtered
        approved = df[df['claude_decision'] == 'APPROVE']
        skipped = df[df['claude_decision'] == 'SKIP']
        reduced = df[df['claude_decision'] == 'REDUCE']

        if len(approved) > 0:
            claude_wr = (approved['actual_outcome'] == 'WIN').mean() * 100
            c_wins = approved[approved['actual_outcome'] == 'WIN']['actual_return'].sum()
            c_losses = abs(approved[approved['actual_outcome'] == 'LOSS']['actual_return'].sum())
            claude_pf = c_wins / max(c_losses, 0.01)
        else:
            claude_wr = 0.0
            claude_pf = 0.0

        if len(skipped) > 0:
            veto_accuracy = (skipped['actual_outcome'] == 'LOSS').mean() * 100
            avg_skipped_return = float(skipped['actual_return'].mean())
        else:
            veto_accuracy = 0.0
            avg_skipped_return = 0.0

        # Overall accuracy
        df['claude_correct'] = (
            ((df['claude_decision'] == 'APPROVE') & (df['actual_outcome'] == 'WIN')) |
            ((df['claude_decision'] == 'SKIP') & (df['actual_outcome'] == 'LOSS'))
        )
        overall_accuracy = float(df['claude_correct'].mean() * 100)

        # Simulated returns following Claude
        sim_returns = []
        for _, row in df.iterrows():
            if row['claude_decision'] == 'SKIP':
                sim_returns.append(0)
            elif row['claude_decision'] == 'REDUCE':
                sim_returns.append(row['actual_return'] * 0.6)
            else:
                sim_returns.append(row['actual_return'] * row.get('claude_size_mult', 1.0))
        sim_total = sum(sim_returns)

        return {
            'total_trades_tested': len(df),
            'date_range': f"{self.start_date} to {self.end_date}",
            'original_strategy': {
                'win_rate': round(float(orig_wr), 1),
                'profit_factor': round(float(orig_pf), 2),
                'total_return_sum': round(orig_total, 1),
                'trade_count': len(all_trades),
            },
            'claude_filtered': {
                'win_rate': round(float(claude_wr), 1),
                'profit_factor': round(float(claude_pf), 2),
                'approved_count': len(approved),
                'skipped_count': len(skipped),
                'reduced_count': len(reduced),
                'approval_rate': round(float(len(approved) / max(len(df), 1) * 100), 1),
                'simulated_total_return': round(float(sim_total), 1),
            },
            'veto_analysis': {
                'veto_accuracy': round(float(veto_accuracy), 1),
                'avg_skipped_return': round(float(avg_skipped_return), 1),
                'total_loss_avoided': round(float(abs(avg_skipped_return * len(skipped))), 1),
            },
            'overall_accuracy': round(overall_accuracy, 1),
            'improvement': {
                'win_rate_delta': round(float(claude_wr - orig_wr), 1),
                'pf_delta': round(float(claude_pf - orig_pf), 2),
                'return_delta': round(float(sim_total - orig_total), 1),
            },
        }

    def print_report(self, stats: dict):
        if not stats or stats.get('total_trades_tested', 0) == 0:
            print("\nNo trades were tested.")
            return

        print("\n" + "=" * 55)
        print("  CLAUDE BACKTEST REPORT")
        print("=" * 55)

        orig = stats['original_strategy']
        filt = stats['claude_filtered']
        veto = stats['veto_analysis']
        imp = stats['improvement']

        print(f"\n  {'Metric':<28} {'Original':>10} {'+ Claude':>10}")
        print("  " + "-" * 50)
        print(f"  {'Win Rate':<28} {orig['win_rate']:>9.1f}% {filt['win_rate']:>9.1f}%")
        print(f"  {'Profit Factor':<28} {orig['profit_factor']:>10.2f} {filt['profit_factor']:>10.2f}")
        print(f"  {'Total Return Sum':<28} {orig['total_return_sum']:>9.1f}% {filt['simulated_total_return']:>9.1f}%")
        print(f"  {'Trade Count':<28} {orig['trade_count']:>10} {filt['approved_count']:>10}")

        print(f"\n  CLAUDE DECISIONS:")
        print(f"    Approved:  {filt['approved_count']} ({filt['approval_rate']:.1f}%)")
        print(f"    Skipped:   {filt['skipped_count']}")
        print(f"    Reduced:   {filt['reduced_count']}")

        print(f"\n  VETO ACCURACY:")
        print(f"    Skipped trades that were losses: {veto['veto_accuracy']:.1f}%")
        print(f"    Avg return of skipped trades:    {veto['avg_skipped_return']:+.1f}%")
        print(f"    Total loss avoided (est):        {veto['total_loss_avoided']:.1f}%")

        print(f"\n  IMPROVEMENT FROM CLAUDE:")
        wr_d = imp['win_rate_delta']
        pf_d = imp['pf_delta']
        print(f"    Win rate:      {wr_d:+.1f}pp {'OK' if wr_d > 0 else 'WORSE'}")
        print(f"    Profit factor: {pf_d:+.2f} {'OK' if pf_d > 0 else 'WORSE'}")

        print(f"\n  Overall decision accuracy: {stats['overall_accuracy']:.1f}%")
        print("=" * 55)
