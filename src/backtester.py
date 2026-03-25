"""
Phase 3: Backtesting Engine
Simulates trading on historical feature data with entry/exit rules,
position sizing, and full performance metrics.
"""

import sys
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    DATA_DIR, RESULTS_DIR, NIFTY_50,
    INITIAL_CAPITAL, MAX_POSITIONS, MAX_POSITION_PCT,
    BROKERAGE_PCT, STT_PCT, ATR_STOP_MULTIPLIER, MIN_ADX,
    BUY_THRESHOLD, ensure_dirs,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"


# ── Data structures ──────────────────────────────────────

@dataclass
class Position:
    ticker: str
    entry_date: pd.Timestamp
    entry_price: float
    shares: int
    position_size: float
    signal_score: float
    atr_stop: float


@dataclass
class Trade:
    ticker: str
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    entry_price: float
    exit_price: float
    shares: int
    position_size: float
    signal_score: float
    atr_stop: float
    gross_pnl: float
    net_pnl: float
    return_pct: float
    hold_days: int
    exit_reason: str


@dataclass
class BacktestResult:
    # Performance
    total_return_pct: float
    annualised_return_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    # Trade stats
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float
    avg_hold_days: float
    # Exit breakdown
    stops_hit: int
    ema_reversals: int
    # Capital
    initial_capital: float
    final_capital: float
    peak_capital: float
    # Benchmark
    nifty_return_pct: float
    alpha: float
    # Daily series
    equity_curve: pd.Series = field(repr=False)
    drawdown_series: pd.Series = field(repr=False)
    trade_log: pd.DataFrame = field(repr=False)
    # Entry/exit dates for plotting
    entry_dates: list = field(default_factory=list, repr=False)
    exit_dates: list = field(default_factory=list, repr=False)
    # Benchmark series
    nifty_curve: pd.Series = field(default=None, repr=False)


# ── Backtester ───────────────────────────────────────────

class Backtester:

    def __init__(self, use_ml: bool = False, use_hybrid: bool = False):
        self.feature_dir = FEATURES_DIR
        self.results_dir = RESULTS_DIR
        self.use_ml = use_ml
        self.use_hybrid = use_hybrid
        self.ml_model = None
        self.stock_data: dict[str, pd.DataFrame] = {}
        self._load_all_features()
        if use_ml or use_hybrid:
            from ml_model import MLModel
            self.ml_model = MLModel()
            self.ml_model.load()
            print(f"  ML model loaded ({len(self.ml_model.feature_columns)} features, "
                  f"threshold={BUY_THRESHOLD})")

    def _load_all_features(self):
        print("Loading feature data...")
        for ticker in NIFTY_50:
            path = self.feature_dir / f"{ticker}.NS.csv"
            if path.exists():
                df = pd.read_csv(path, index_col="Date", parse_dates=True)
                self.stock_data[ticker] = df
        print(f"  Loaded {len(self.stock_data)} stocks")

    def _get_all_dates(self, start: pd.Timestamp, end: pd.Timestamp) -> pd.DatetimeIndex:
        all_dates = set()
        for df in self.stock_data.values():
            all_dates.update(df.index)
        dates = pd.DatetimeIndex(sorted(all_dates))
        return dates[(dates >= start) & (dates <= end)]

    def _signal_score(self, row: pd.Series) -> float:
        adx = min(row.get("adx_14", 0), 100)
        rsi = min(row.get("rsi_14", 0), 100)
        return (adx / 100) * 0.5 + (rsi / 100) * 0.5

    def _check_entry(self, row: pd.Series) -> bool:
        return (
            row.get("ema_cross_up", 0) == 1
            and row.get("ema_21_above_50", 0) == 1
            and row.get("adx_14", 0) > MIN_ADX
            and row.get("rsi_14", 0) > 50
            and row.get("volume_spike", 0) == 0
        )

    def _check_hybrid_entry(self, row: pd.Series) -> bool:
        return (
            row.get("in_momentum_regime", 0) == 1
            and row.get("hybrid_signal", 0) == 1
            and row.get("dip_conviction", 0) >= 1
            and row.get("volume_ratio", 0) > 0.8
        )

    def _fetch_nifty(self, start: pd.Timestamp, end: pd.Timestamp) -> pd.Series:
        print("  Fetching Nifty 50 index benchmark (^NSEI)...")
        raw = yf.download("^NSEI", start=start, end=end + pd.Timedelta(days=5), progress=False)
        if raw.empty:
            return pd.Series(dtype=float)
        if isinstance(raw.columns, pd.MultiIndex):
            raw = raw.droplevel("Ticker", axis=1)
        raw.index = pd.to_datetime(raw.index).tz_localize(None)
        return raw["Close"]

    def run(self, start_date: str, end_date: str) -> BacktestResult:
        start = pd.Timestamp(start_date)
        end = pd.Timestamp(end_date)
        dates = self._get_all_dates(start, end)

        if len(dates) == 0:
            raise ValueError(f"No trading data between {start_date} and {end_date}")

        print(f"\n  Running backtest: {dates[0].date()} to {dates[-1].date()}")
        print(f"  Trading days: {len(dates)}")

        # State
        cash = float(INITIAL_CAPITAL)
        positions: dict[str, Position] = {}
        closed_trades: list[Trade] = []
        equity_values = {}
        entry_plot_dates = []
        exit_plot_dates = []

        # Hybrid constants
        HYBRID_ATR_STOP = 1.5
        HYBRID_ATR_TARGET = 3.0
        HYBRID_RISK_PCT = 0.015

        for i, date in enumerate(dates):
            # ── Check exits first ────────────────────────
            tickers_to_close = []
            for ticker, pos in positions.items():
                if ticker not in self.stock_data:
                    continue
                df = self.stock_data[ticker]
                if date not in df.index:
                    continue
                row = df.loc[date]

                exit_price = None
                exit_reason = None
                exit_date = date

                if self.use_hybrid:
                    # Hybrid exit 1: Target hit (high reaches target)
                    target_price = pos.entry_price + HYBRID_ATR_TARGET * (pos.entry_price - pos.atr_stop) / HYBRID_ATR_STOP
                    if row["High"] >= target_price:
                        exit_price = round(target_price, 2)
                        exit_reason = "target_hit"
                    # Hybrid exit 2: EMA cross down → next open
                    elif row.get("ema_cross_down", 0) == 1:
                        next_dates = dates[dates > date]
                        if len(next_dates) > 0:
                            next_date = next_dates[0]
                            if next_date in df.index:
                                exit_price = df.loc[next_date, "Open"]
                                exit_date = next_date
                                exit_reason = "ema_reversal"
                    # Hybrid exit 3: Stop loss (low breaches stop)
                    elif row["Low"] <= pos.atr_stop:
                        exit_price = pos.atr_stop
                        exit_reason = "stop_loss"
                else:
                    # Original exit logic
                    # 1. ATR stop-loss
                    if row["Low"] <= pos.atr_stop:
                        exit_price = pos.atr_stop
                        exit_reason = "stop_loss"
                    # 2. EMA cross down → exit at next day's Open
                    elif row.get("ema_cross_down", 0) == 1:
                        next_dates = dates[dates > date]
                        if len(next_dates) > 0:
                            next_date = next_dates[0]
                            if next_date in df.index:
                                exit_price = df.loc[next_date, "Open"]
                                exit_date = next_date
                                exit_reason = "ema_reversal"

                if exit_price is not None and exit_reason is not None:
                    proceeds = pos.shares * exit_price * (1 - BROKERAGE_PCT - STT_PCT)
                    cost_basis = pos.shares * pos.entry_price * (1 + BROKERAGE_PCT)
                    gross_pnl = pos.shares * (exit_price - pos.entry_price)
                    net_pnl = proceeds - cost_basis
                    ret_pct = (exit_price / pos.entry_price - 1) * 100
                    hold = (exit_date - pos.entry_date).days

                    closed_trades.append(Trade(
                        ticker=ticker, entry_date=pos.entry_date,
                        exit_date=exit_date, entry_price=pos.entry_price,
                        exit_price=round(exit_price, 2), shares=pos.shares,
                        position_size=pos.position_size, signal_score=pos.signal_score,
                        atr_stop=pos.atr_stop, gross_pnl=round(gross_pnl, 2),
                        net_pnl=round(net_pnl, 2), return_pct=round(ret_pct, 2),
                        hold_days=hold, exit_reason=exit_reason,
                    ))
                    cash += proceeds
                    tickers_to_close.append(ticker)
                    exit_plot_dates.append(exit_date)

            for t in tickers_to_close:
                del positions[t]

            # ── Check entries ────────────────────────────
            if len(positions) < MAX_POSITIONS:
                for ticker, df in self.stock_data.items():
                    if ticker in positions:
                        continue
                    if date not in df.index:
                        continue
                    row = df.loc[date]

                    if self.use_hybrid:
                        if not self._check_hybrid_entry(row):
                            continue
                    else:
                        if not self._check_entry(row):
                            continue

                    # ML filter — score directly from loaded row
                    ml_score = 0.0
                    if (self.use_ml or self.use_hybrid) and self.ml_model is not None:
                        feat_cols = self.ml_model.feature_columns
                        available = [c for c in feat_cols if c in df.columns]
                        if len(available) < len(feat_cols):
                            continue
                        row_df = df.loc[[date], feat_cols]
                        if row_df.isna().any(axis=1).iloc[0]:
                            continue
                        ml_score = float(
                            self.ml_model.model.predict_proba(row_df.values)[:, 1][0]
                        )
                        if ml_score < BUY_THRESHOLD:
                            continue

                    if len(positions) >= MAX_POSITIONS:
                        break

                    # Entry at next day's Open
                    next_dates = dates[dates > date]
                    if len(next_dates) == 0:
                        continue
                    next_date = next_dates[0]
                    if next_date not in df.index:
                        continue

                    entry_price = df.loc[next_date, "Open"]
                    if entry_price <= 0:
                        continue

                    atr = row.get("atr_14", 0)
                    if atr <= 0:
                        continue

                    if self.use_hybrid:
                        # Hybrid sizing: 1.5% risk model
                        portfolio_value = cash + sum(
                            p.shares * self.stock_data[p.ticker].loc[date, "Close"]
                            for p in positions.values()
                            if date in self.stock_data[p.ticker].index
                        )
                        risk_amount = portfolio_value * HYBRID_RISK_PCT
                        atr_stop = round(entry_price - HYBRID_ATR_STOP * atr, 2)
                        risk_per_share = entry_price - atr_stop
                        if risk_per_share <= 0:
                            continue

                        shares = math.floor(risk_amount / risk_per_share)
                        if shares <= 0:
                            continue

                        pos_size = shares * entry_price * (1 + BROKERAGE_PCT)
                        max_pos = portfolio_value * MAX_POSITION_PCT
                        if pos_size > max_pos:
                            shares = math.floor(max_pos / (entry_price * (1 + BROKERAGE_PCT)))
                            pos_size = shares * entry_price * (1 + BROKERAGE_PCT)
                        if shares <= 0 or pos_size > cash or cash < 5000:
                            continue

                        score = ml_score
                    else:
                        # Original sizing
                        portfolio_value = cash + sum(
                            p.shares * self.stock_data[p.ticker].loc[date, "Close"]
                            for p in positions.values()
                            if date in self.stock_data[p.ticker].index
                        )
                        open_count = len(positions)
                        slots_left = MAX_POSITIONS - open_count
                        if slots_left <= 0:
                            break

                        score = self._signal_score(row)
                        base_alloc = cash / slots_left
                        pos_size = base_alloc * (0.5 + score)
                        pos_size = min(pos_size, portfolio_value * MAX_POSITION_PCT)

                        actual_cost_per_share = entry_price * (1 + BROKERAGE_PCT)
                        shares = math.floor(pos_size / actual_cost_per_share)
                        if shares <= 0:
                            continue
                        pos_size = shares * actual_cost_per_share

                        if pos_size > cash or cash < 5000:
                            continue

                        atr_stop = round(entry_price - ATR_STOP_MULTIPLIER * atr, 2)

                    positions[ticker] = Position(
                        ticker=ticker, entry_date=next_date,
                        entry_price=entry_price, shares=shares,
                        position_size=round(pos_size, 2),
                        signal_score=round(score, 4), atr_stop=atr_stop,
                    )
                    cash -= pos_size
                    entry_plot_dates.append(next_date)

            # ── Mark-to-market ───────────────────────────
            invested = 0.0
            for pos in positions.values():
                t_df = self.stock_data[pos.ticker]
                if date in t_df.index:
                    invested += pos.shares * t_df.loc[date, "Close"]
                else:
                    invested += pos.shares * pos.entry_price
            equity_values[date] = cash + invested

        # ── Build result ─────────────────────────────────
        equity = pd.Series(equity_values, name="equity").sort_index()
        daily_ret = equity.pct_change().dropna()

        final = equity.iloc[-1]
        total_ret = (final / INITIAL_CAPITAL - 1) * 100
        days_held = (dates[-1] - dates[0]).days
        ann_ret = ((final / INITIAL_CAPITAL) ** (365 / max(days_held, 1)) - 1) * 100

        sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0.0
        downside = daily_ret[daily_ret < 0]
        sortino = (daily_ret.mean() / downside.std() * np.sqrt(252)) if len(downside) > 0 and downside.std() > 0 else 0.0

        rolling_max = equity.cummax()
        drawdown = (equity - rolling_max) / rolling_max
        max_dd = drawdown.min() * 100

        wins = [t for t in closed_trades if t.net_pnl > 0]
        losses = [t for t in closed_trades if t.net_pnl <= 0]
        total_trades = len(closed_trades)
        win_rate = len(wins) / total_trades * 100 if total_trades > 0 else 0.0
        avg_win = np.mean([t.return_pct for t in wins]) if wins else 0.0
        avg_loss = np.mean([t.return_pct for t in losses]) if losses else 0.0
        gross_wins = sum(t.net_pnl for t in wins)
        gross_losses = abs(sum(t.net_pnl for t in losses))
        profit_factor = gross_wins / gross_losses if gross_losses > 0 else float("inf")
        avg_hold = np.mean([t.hold_days for t in closed_trades]) if closed_trades else 0.0

        stops = sum(1 for t in closed_trades if t.exit_reason == "stop_loss")
        ema_revs = sum(1 for t in closed_trades if t.exit_reason == "ema_reversal")

        # Benchmark
        nifty_close = self._fetch_nifty(dates[0], dates[-1])
        nifty_ret = 0.0
        nifty_curve = None
        if len(nifty_close) >= 2:
            nifty_start = nifty_close.iloc[0]
            nifty_end = nifty_close.iloc[-1]
            nifty_ret = (nifty_end / nifty_start - 1) * 100
            nifty_curve = nifty_close / nifty_start * INITIAL_CAPITAL

        # Trade log DataFrame
        trade_records = []
        for t in closed_trades:
            trade_records.append({
                "ticker": t.ticker, "entry_date": t.entry_date.strftime("%Y-%m-%d"),
                "exit_date": t.exit_date.strftime("%Y-%m-%d"),
                "entry_price": t.entry_price, "exit_price": t.exit_price,
                "shares": t.shares, "position_size": t.position_size,
                "signal_score": t.signal_score, "atr_stop": t.atr_stop,
                "gross_pnl": t.gross_pnl, "net_pnl": t.net_pnl,
                "return_pct": t.return_pct, "hold_days": t.hold_days,
                "exit_reason": t.exit_reason,
            })
        trade_df = pd.DataFrame(trade_records)

        result = BacktestResult(
            total_return_pct=round(total_ret, 2),
            annualised_return_pct=round(ann_ret, 2),
            sharpe_ratio=round(sharpe, 2),
            sortino_ratio=round(sortino, 2),
            max_drawdown_pct=round(max_dd, 2),
            total_trades=total_trades,
            winning_trades=len(wins),
            losing_trades=len(losses),
            win_rate_pct=round(win_rate, 1),
            avg_win_pct=round(avg_win, 2),
            avg_loss_pct=round(avg_loss, 2),
            profit_factor=round(profit_factor, 2),
            avg_hold_days=round(avg_hold, 1),
            stops_hit=stops,
            ema_reversals=ema_revs,
            initial_capital=INITIAL_CAPITAL,
            final_capital=round(final, 2),
            peak_capital=round(equity.max(), 2),
            nifty_return_pct=round(nifty_ret, 2),
            alpha=round(total_ret - nifty_ret, 2),
            equity_curve=equity,
            drawdown_series=drawdown,
            trade_log=trade_df,
            entry_dates=entry_plot_dates,
            exit_dates=exit_plot_dates,
            nifty_curve=nifty_curve,
        )

        return result

    def plot_equity_curve(self, result: BacktestResult):
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), height_ratios=[3, 1],
                                        sharex=True, gridspec_kw={"hspace": 0.08})

        # Top: equity curve + benchmark
        ax1.plot(result.equity_curve.index, result.equity_curve.values,
                 color="#2196F3", linewidth=1.5, label="Strategy")
        if result.nifty_curve is not None:
            ax1.plot(result.nifty_curve.index, result.nifty_curve.values,
                     color="#9E9E9E", linewidth=1.0, linestyle="--", label="Nifty 50 (B&H)")

        # Entry/exit markers on equity curve
        for d in result.entry_dates:
            if d in result.equity_curve.index:
                ax1.plot(d, result.equity_curve[d], "^", color="#4CAF50",
                         markersize=5, alpha=0.6)
        for d in result.exit_dates:
            if d in result.equity_curve.index:
                ax1.plot(d, result.equity_curve[d], "v", color="#F44336",
                         markersize=5, alpha=0.6)

        ax1.set_ylabel("Portfolio Value (Rs)")
        ax1.legend(loc="upper left")
        ax1.grid(True, alpha=0.3)
        ax1.set_title("Equity Curve vs Nifty 50 Benchmark")

        # Format y-axis with commas
        ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"{x:,.0f}"))

        # Bottom: drawdown
        ax2.fill_between(result.drawdown_series.index, result.drawdown_series.values * 100,
                         0, color="#F44336", alpha=0.4)
        ax2.set_ylabel("Drawdown (%)")
        ax2.set_xlabel("Date")
        ax2.grid(True, alpha=0.3)
        ax2.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
        ax2.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
        fig.autofmt_xdate(rotation=30)

        path = self.results_dir / "equity_curve.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"\n  Equity curve saved to {path}")

    def save_trade_log(self, result: BacktestResult):
        path = self.results_dir / "trade_log.csv"
        result.trade_log.to_csv(path, index=False)
        print(f"  Trade log saved to {path}")

    @staticmethod
    def print_report(r: BacktestResult):
        def fmt_inr(v):
            """Format number in Indian comma style: 10,00,000"""
            s = f"{v:,.0f}"
            return s

        eq = "=" * 46
        ln = "-" * 46

        print(f"\n  +{eq}+")
        print(f"  |{'BACKTEST RESULTS':^46}|")
        print(f"  +{eq}+")
        start_d = r.equity_curve.index[0].strftime("%Y-%m-%d")
        end_d = r.equity_curve.index[-1].strftime("%Y-%m-%d")
        print(f"  | Period    : {start_d} to {end_d}     |")
        print(f"  | Capital   : Rs {fmt_inr(r.initial_capital)} -> Rs {fmt_inr(r.final_capital):>12} |")
        print(f"  +{ln}+")
        print(f"  | {'PERFORMANCE':<44} |")
        print(f"  | Total Return    : {r.total_return_pct:>8.1f}%{' '*17}|")
        print(f"  | Annualised      : {r.annualised_return_pct:>8.1f}%{' '*17}|")
        print(f"  | Nifty 50 Return : {r.nifty_return_pct:>8.1f}%  (benchmark){' '*5}|")
        sign = "+" if r.alpha >= 0 else ""
        print(f"  | Alpha           : {sign}{r.alpha:.1f}%{' '*21}|")
        print(f"  +{ln}+")
        print(f"  | {'RISK':<44} |")
        print(f"  | Sharpe Ratio    : {r.sharpe_ratio:>8.2f}{' '*18}|")
        print(f"  | Sortino Ratio   : {r.sortino_ratio:>8.2f}{' '*18}|")
        print(f"  | Max Drawdown    : {r.max_drawdown_pct:>8.1f}%{' '*17}|")
        print(f"  +{ln}+")
        print(f"  | {'TRADES':<44} |")
        print(f"  | Total Trades    : {r.total_trades:>8}{' '*18}|")
        print(f"  | Win Rate        : {r.win_rate_pct:>8.1f}%{' '*17}|")
        print(f"  | Avg Win         : {r.avg_win_pct:>+8.1f}%{' '*17}|")
        print(f"  | Avg Loss        : {r.avg_loss_pct:>+8.1f}%{' '*17}|")
        print(f"  | Profit Factor   : {r.profit_factor:>8.2f}{' '*18}|")
        print(f"  | Avg Hold Days   : {r.avg_hold_days:>8.1f} days{' '*13}|")
        print(f"  +{ln}+")
        print(f"  | {'EXIT REASONS':<44} |")
        print(f"  | ATR Stop Loss   : {r.stops_hit:>8} trades{' '*11}|")
        print(f"  | EMA Reversal    : {r.ema_reversals:>8} trades{' '*11}|")
        print(f"  +{eq}+")


def run_comparison(start_date="2022-01-01", end_date="2026-03-24"):
    """Run 3-way backtest comparison: Rules-only vs Rules+ML vs Hybrid."""
    results = {}

    # ── Backtest A: Rules only ──────────────────────
    print(f"\n{'#'*70}")
    print(f"  BACKTEST A: Rules-Only (no ML)")
    print(f"{'#'*70}")
    bt_a = Backtester(use_ml=False, use_hybrid=False)
    results["rules"] = bt_a.run(start_date, end_date)

    # ── Backtest B: Rules + ML ──────────────────────
    print(f"\n{'#'*70}")
    print(f"  BACKTEST B: Rules + ML Filter")
    print(f"{'#'*70}")
    bt_b = Backtester(use_ml=True, use_hybrid=False)
    results["rules_ml"] = bt_b.run(start_date, end_date)

    # ── Backtest C: Hybrid ──────────────────────────
    print(f"\n{'#'*70}")
    print(f"  BACKTEST C: Hybrid Dip Strategy")
    print(f"{'#'*70}")
    bt_c = Backtester(use_ml=True, use_hybrid=True)
    results["hybrid"] = bt_c.run(start_date, end_date)

    # ── Comparison table ────────────────────────────
    ra = results["rules"]
    rb = results["rules_ml"]
    rc = results["hybrid"]

    w = 66
    eq = "=" * w
    ln = "-" * w
    print(f"\n  +{eq}+")
    print(f"  |{'3-WAY BACKTEST COMPARISON':^{w}}|")
    print(f"  +{eq}+")
    print(f"  | {'Metric':<24}{'Rules':>12}{'Rules+ML':>14}{'Hybrid':>14} |")
    print(f"  +{ln}+")

    rows = [
        ("Total Return",     f"{ra.total_return_pct:+.1f}%",   f"{rb.total_return_pct:+.1f}%",   f"{rc.total_return_pct:+.1f}%"),
        ("Annualised Return", f"{ra.annualised_return_pct:+.1f}%", f"{rb.annualised_return_pct:+.1f}%", f"{rc.annualised_return_pct:+.1f}%"),
        ("Sharpe Ratio",     f"{ra.sharpe_ratio:.2f}",        f"{rb.sharpe_ratio:.2f}",        f"{rc.sharpe_ratio:.2f}"),
        ("Max Drawdown",     f"{ra.max_drawdown_pct:.1f}%",   f"{rb.max_drawdown_pct:.1f}%",   f"{rc.max_drawdown_pct:.1f}%"),
        ("Total Trades",     f"{ra.total_trades}",            f"{rb.total_trades}",            f"{rc.total_trades}"),
        ("Win Rate",         f"{ra.win_rate_pct:.1f}%",       f"{rb.win_rate_pct:.1f}%",       f"{rc.win_rate_pct:.1f}%"),
        ("Avg Win",          f"{ra.avg_win_pct:+.1f}%",       f"{rb.avg_win_pct:+.1f}%",       f"{rc.avg_win_pct:+.1f}%"),
        ("Avg Loss",         f"{ra.avg_loss_pct:+.1f}%",      f"{rb.avg_loss_pct:+.1f}%",      f"{rc.avg_loss_pct:+.1f}%"),
        ("Profit Factor",    f"{ra.profit_factor:.2f}",        f"{rb.profit_factor:.2f}",        f"{rc.profit_factor:.2f}"),
        ("Avg Hold Days",    f"{ra.avg_hold_days:.1f}",        f"{rb.avg_hold_days:.1f}",        f"{rc.avg_hold_days:.1f}"),
    ]
    for label, va, vb, vc in rows:
        print(f"  | {label:<24}{va:>12}{vb:>14}{vc:>14} |")
    print(f"  +{eq}+")

    # ── Year-by-year for Hybrid (Backtest C) ────────
    if rc.total_trades > 0 and len(rc.trade_log) > 0:
        print(f"\n  +{eq}+")
        print(f"  |{'HYBRID STRATEGY — YEAR-BY-YEAR':^{w}}|")
        print(f"  +{eq}+")
        print(f"  | {'Year':<8}{'Trades':>8}{'Win Rate':>12}{'Avg Return':>14}{'Total PnL':>14} |")
        print(f"  +{ln}+")

        tl = rc.trade_log.copy()
        tl["year"] = pd.to_datetime(tl["entry_date"]).dt.year
        for year in sorted(tl["year"].unique()):
            yt = tl[tl["year"] == year]
            n = len(yt)
            wins = (yt["net_pnl"] > 0).sum()
            wr = wins / n * 100 if n > 0 else 0
            avg_r = yt["return_pct"].mean()
            total_pnl = yt["net_pnl"].sum()
            print(f"  | {year:<8}{n:>8}{wr:>11.1f}%{avg_r:>+13.2f}%{total_pnl:>+13,.0f} |")
        print(f"  +{eq}+")

    # ── Save hybrid trade log ───────────────────────
    if len(rc.trade_log) > 0:
        hybrid_path = RESULTS_DIR / "hybrid_trade_log.csv"
        rc.trade_log.to_csv(hybrid_path, index=False)
        print(f"\n  Hybrid trade log saved to {hybrid_path}")

    # ── Save comparison equity curves ───────────────
    eq_df = pd.DataFrame({
        "date": ra.equity_curve.index,
        "rules_only": ra.equity_curve.values,
    }).set_index("date")

    # Align all curves to same index
    eq_df["rules_ml"] = rb.equity_curve.reindex(eq_df.index).values
    eq_df["hybrid"] = rc.equity_curve.reindex(eq_df.index).values
    eq_df = eq_df.ffill()

    eq_path = RESULTS_DIR / "comparison_equity.csv"
    eq_df.to_csv(eq_path)
    print(f"  Comparison equity curves saved to {eq_path}")

    return results


if __name__ == "__main__":
    if "--compare" in sys.argv:
        run_comparison()
    else:
        bt = Backtester()
        result = bt.run("2022-01-01", "2026-03-24")
        Backtester.print_report(result)
        bt.plot_equity_curve(result)
        bt.save_trade_log(result)

        tl = result.trade_log
        if len(tl) > 0:
            print(f"\n  TRADE LOG — First 10 trades:")
            print(tl.head(10).to_string(index=False))
            print(f"\n  TRADE LOG — Last 10 trades:")
            print(tl.tail(10).to_string(index=False))
        else:
            print("\n  No trades were executed.")
