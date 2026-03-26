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
    BUY_THRESHOLD, ensure_dirs, get_sector,
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
    atr_at_entry: float = 0.0
    # Partial profit tracking
    partial_exit_done: bool = False
    partial_target: float = 0.0
    full_target: float = 0.0
    original_shares: int = 0
    partial_pnl: float = 0.0


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
    total_return_pct: float
    annualised_return_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float
    avg_hold_days: float
    stops_hit: int
    ema_reversals: int
    initial_capital: float
    final_capital: float
    peak_capital: float
    nifty_return_pct: float
    alpha: float
    equity_curve: pd.Series = field(repr=False)
    drawdown_series: pd.Series = field(repr=False)
    trade_log: pd.DataFrame = field(repr=False)
    entry_dates: list = field(default_factory=list, repr=False)
    exit_dates: list = field(default_factory=list, repr=False)
    nifty_curve: pd.Series = field(default=None, repr=False)
    # Extended exit counts
    target_hits: int = 0
    partial_exits: int = 0
    sector_exits: int = 0


# ── Backtester ───────────────────────────────────────────

class Backtester:

    def __init__(self, use_ml=False, use_hybrid=False,
                 use_partial_profits=False, use_sector_rotation=False):
        self.feature_dir = FEATURES_DIR
        self.results_dir = RESULTS_DIR
        self.use_ml = use_ml
        self.use_hybrid = use_hybrid
        self.use_partial_profits = use_partial_profits
        self.use_sector_rotation = use_sector_rotation
        self.ml_model = None
        self.stock_data = {}
        self._load_all_features()
        if use_ml or use_hybrid:
            from ml_model import MLModel
            self.ml_model = MLModel()
            self.ml_model.load()
            print(f"  ML model loaded ({len(self.ml_model.feature_columns)} features, "
                  f"threshold={BUY_THRESHOLD})")
        if use_sector_rotation:
            print("  Precomputing sector rankings...")
            self._precompute_sector_data()
            print(f"  Sector cache: {len(self._sector_cache)} dates")

    def _load_all_features(self):
        print("Loading feature data...")
        for ticker in NIFTY_50:
            path = self.feature_dir / f"{ticker}.NS.csv"
            if path.exists():
                df = pd.read_csv(path, index_col="Date", parse_dates=True)
                self.stock_data[ticker] = df
        print(f"  Loaded {len(self.stock_data)} stocks")

    def _get_all_dates(self, start, end):
        all_dates = set()
        for df in self.stock_data.values():
            all_dates.update(df.index)
        dates = pd.DatetimeIndex(sorted(all_dates))
        return dates[(dates >= start) & (dates <= end)]

    def _signal_score(self, row):
        adx = min(row.get("adx_14", 0), 100)
        rsi = min(row.get("rsi_14", 0), 100)
        return (adx / 100) * 0.5 + (rsi / 100) * 0.5

    def _check_entry(self, row):
        return (row.get("ema_cross_up", 0) == 1 and row.get("ema_21_above_50", 0) == 1
                and row.get("adx_14", 0) > MIN_ADX and row.get("rsi_14", 0) > 50
                and row.get("volume_spike", 0) == 0)

    def _check_hybrid_entry(self, row):
        return (row.get("in_momentum_regime", 0) == 1 and row.get("hybrid_signal", 0) == 1
                and row.get("dip_conviction", 0) >= 1 and row.get("volume_ratio", 0) > 0.8)

    def _precompute_sector_data(self):
        """Pre-build sector lookup for all dates (called once)."""
        self._sector_cache = {}
        sector_map = {}
        for ticker in self.stock_data:
            sector_map[ticker] = get_sector(ticker)

        # Group by date using a sample of 50 stocks per sector for speed
        all_dates = set()
        for df in self.stock_data.values():
            all_dates.update(df.index)

        for date in sorted(all_dates):
            scores = {}
            counts = {}
            for ticker, df in self.stock_data.items():
                if date not in df.index:
                    continue
                row = df.loc[date]
                ret20 = row.get("return_20d", 0)
                adx = row.get("adx_14", 0)
                if pd.isna(ret20) or pd.isna(adx):
                    continue
                s = sector_map[ticker]
                scores[s] = scores.get(s, 0) + float(ret20) * 0.6 + (float(adx) / 50) * 0.4
                counts[s] = counts.get(s, 0) + 1

            avg = {s: scores[s] / counts[s] for s in scores if counts[s] > 0}
            ranked = sorted(avg.items(), key=lambda x: x[1])
            bottom3 = set(s for s, _ in ranked[:3]) if len(ranked) >= 3 else set()
            self._sector_cache[date] = bottom3

    def _get_bottom3_sectors(self, date):
        """Fast lookup from precomputed cache."""
        return self._sector_cache.get(date, set())

    def _fetch_nifty(self, start, end):
        print("  Fetching Nifty 50 index benchmark (^NSEI)...")
        try:
            raw = yf.download("^NSEI", start=start, end=end + pd.Timedelta(days=5), progress=False)
            if raw.empty:
                return pd.Series(dtype=float)
            if isinstance(raw.columns, pd.MultiIndex):
                raw = raw.droplevel("Ticker", axis=1)
            raw.index = pd.to_datetime(raw.index).tz_localize(None)
            return raw["Close"]
        except Exception:
            return pd.Series(dtype=float)

    def run(self, start_date, end_date):
        start = pd.Timestamp(start_date)
        end = pd.Timestamp(end_date)
        dates = self._get_all_dates(start, end)

        if len(dates) == 0:
            raise ValueError(f"No trading data between {start_date} and {end_date}")

        flags = []
        if self.use_hybrid:
            flags.append("hybrid")
        if self.use_ml:
            flags.append("ML")
        if self.use_partial_profits:
            flags.append("partial_profits")
        if self.use_sector_rotation:
            flags.append("sector_rotation")
        print(f"\n  Running backtest: {dates[0].date()} to {dates[-1].date()}")
        print(f"  Trading days: {len(dates)}  Flags: {', '.join(flags) or 'none'}")

        # State
        cash = float(INITIAL_CAPITAL)
        positions = {}
        closed_trades = []
        equity_values = {}
        entry_plot_dates = []
        exit_plot_dates = []

        # Sector rotation state
        bottom3_sectors = set()
        last_sector_update = None
        sector_exit_count = 0
        sector_exit_tickers = []

        # Partial profit counters
        partial_exit_count = 0
        partial_hit_full_count = 0
        partial_breakeven_count = 0

        HYBRID_ATR_STOP = 1.5
        HYBRID_ATR_TARGET = 3.0
        HYBRID_RISK_PCT = 0.015
        PARTIAL_ATR_TARGET = 2.0

        for i, date in enumerate(dates):
            # ── Sector rotation: lookup from precomputed cache ──
            if self.use_sector_rotation:
                if last_sector_update is None or i - last_sector_update >= 5:
                    bottom3_sectors = self._get_bottom3_sectors(date)
                    last_sector_update = i

            # ── Check exits ──────────────────────────────
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

                # ── Partial profit check (before full exit) ──
                if self.use_partial_profits and not pos.partial_exit_done:
                    if row["High"] >= pos.partial_target and pos.partial_target > 0:
                        # Sell 50% at partial target
                        sold_shares = math.floor(pos.original_shares * 0.5)
                        if sold_shares > 0:
                            partial_proceeds = sold_shares * pos.partial_target * (1 - BROKERAGE_PCT - STT_PCT)
                            partial_cost = sold_shares * pos.entry_price * (1 + BROKERAGE_PCT)
                            pos.partial_pnl = partial_proceeds - partial_cost
                            pos.shares -= sold_shares
                            pos.partial_exit_done = True
                            pos.atr_stop = pos.entry_price  # Move stop to breakeven
                            cash += partial_proceeds
                            partial_exit_count += 1

                if self.use_hybrid:
                    target_price = pos.full_target if self.use_partial_profits else (
                        pos.entry_price + HYBRID_ATR_TARGET * pos.atr_at_entry)
                    if row["High"] >= target_price and target_price > 0:
                        exit_price = round(target_price, 2)
                        exit_reason = "target_hit_full" if pos.partial_exit_done else "target_hit"
                        if pos.partial_exit_done:
                            partial_hit_full_count += 1
                    elif row.get("ema_cross_down", 0) == 1:
                        next_dates = dates[dates > date]
                        if len(next_dates) > 0:
                            nd = next_dates[0]
                            if nd in df.index:
                                exit_price = df.loc[nd, "Open"]
                                exit_date = nd
                                exit_reason = "ema_reversal"
                    elif row["Low"] <= pos.atr_stop:
                        exit_price = pos.atr_stop
                        exit_reason = "stop_loss"
                        if pos.partial_exit_done and abs(pos.atr_stop - pos.entry_price) < 0.01:
                            partial_breakeven_count += 1
                else:
                    if row["Low"] <= pos.atr_stop:
                        exit_price = pos.atr_stop
                        exit_reason = "stop_loss"
                    elif row.get("ema_cross_down", 0) == 1:
                        next_dates = dates[dates > date]
                        if len(next_dates) > 0:
                            nd = next_dates[0]
                            if nd in df.index:
                                exit_price = df.loc[nd, "Open"]
                                exit_date = nd
                                exit_reason = "ema_reversal"

                # ── Sector rotation exit ─────────────────
                if exit_price is None and self.use_sector_rotation:
                    sector = get_sector(ticker)
                    hold_days = (date - pos.entry_date).days
                    if sector in bottom3_sectors and hold_days > 5:
                        next_dates = dates[dates > date]
                        if len(next_dates) > 0:
                            nd = next_dates[0]
                            if nd in df.index:
                                exit_price = df.loc[nd, "Open"]
                                exit_date = nd
                                exit_reason = "sector_rotation"
                                sector_exit_count += 1
                                sector_exit_tickers.append(sector)

                if exit_price is not None and exit_reason is not None:
                    remaining = pos.shares
                    if remaining <= 0:
                        tickers_to_close.append(ticker)
                        continue
                    proceeds = remaining * exit_price * (1 - BROKERAGE_PCT - STT_PCT)
                    gross_pnl = remaining * (exit_price - pos.entry_price)
                    # Total net includes partial PnL
                    cost_basis = remaining * pos.entry_price * (1 + BROKERAGE_PCT)
                    net_pnl = (proceeds - cost_basis) + pos.partial_pnl
                    # Return pct based on full original position
                    total_proceeds = proceeds + (pos.partial_pnl + math.floor(pos.original_shares * 0.5) * pos.entry_price * (1 + BROKERAGE_PCT) if pos.partial_exit_done else 0)
                    full_cost = pos.original_shares * pos.entry_price * (1 + BROKERAGE_PCT) if pos.original_shares > 0 else pos.position_size
                    ret_pct = (net_pnl / full_cost * 100) if full_cost > 0 else 0
                    hold = (exit_date - pos.entry_date).days

                    closed_trades.append(Trade(
                        ticker=ticker, entry_date=pos.entry_date,
                        exit_date=exit_date, entry_price=pos.entry_price,
                        exit_price=round(exit_price, 2),
                        shares=pos.original_shares if pos.original_shares else pos.shares,
                        position_size=pos.position_size,
                        signal_score=pos.signal_score, atr_stop=pos.atr_stop,
                        gross_pnl=round(gross_pnl, 2), net_pnl=round(net_pnl, 2),
                        return_pct=round(ret_pct, 2), hold_days=hold,
                        exit_reason=exit_reason,
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

                    # Sector rotation: block entries in bottom 3
                    if self.use_sector_rotation and get_sector(ticker) in bottom3_sectors:
                        continue

                    if self.use_hybrid:
                        if not self._check_hybrid_entry(row):
                            continue
                    else:
                        if not self._check_entry(row):
                            continue

                    ml_score = 0.0
                    if (self.use_ml or self.use_hybrid) and self.ml_model is not None:
                        feat_cols = self.ml_model.feature_columns
                        available = [c for c in feat_cols if c in df.columns]
                        if len(available) < len(feat_cols):
                            continue
                        row_df = df.loc[[date], feat_cols]
                        if row_df.isna().any(axis=1).iloc[0]:
                            continue
                        ml_score = float(self.ml_model.model.predict_proba(row_df.values)[:, 1][0])
                        if ml_score < BUY_THRESHOLD:
                            continue

                    if len(positions) >= MAX_POSITIONS:
                        break

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
                        portfolio_value = cash + sum(
                            p.shares * self.stock_data[p.ticker].loc[date, "Close"]
                            for p in positions.values()
                            if date in self.stock_data[p.ticker].index)
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
                        portfolio_value = cash + sum(
                            p.shares * self.stock_data[p.ticker].loc[date, "Close"]
                            for p in positions.values()
                            if date in self.stock_data[p.ticker].index)
                        slots_left = MAX_POSITIONS - len(positions)
                        if slots_left <= 0:
                            break
                        score = self._signal_score(row)
                        base_alloc = cash / slots_left
                        pos_size = min(base_alloc * (0.5 + score), portfolio_value * MAX_POSITION_PCT)
                        shares = math.floor(pos_size / (entry_price * (1 + BROKERAGE_PCT)))
                        if shares <= 0:
                            continue
                        pos_size = shares * entry_price * (1 + BROKERAGE_PCT)
                        if pos_size > cash or cash < 5000:
                            continue
                        atr_stop = round(entry_price - ATR_STOP_MULTIPLIER * atr, 2)

                    partial_tgt = entry_price + PARTIAL_ATR_TARGET * atr if self.use_partial_profits else 0
                    full_tgt = entry_price + HYBRID_ATR_TARGET * atr if self.use_hybrid else 0

                    positions[ticker] = Position(
                        ticker=ticker, entry_date=next_date,
                        entry_price=entry_price, shares=shares,
                        position_size=round(pos_size, 2),
                        signal_score=round(score, 4), atr_stop=atr_stop,
                        atr_at_entry=atr,
                        partial_target=round(partial_tgt, 2),
                        full_target=round(full_tgt, 2),
                        original_shares=shares,
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
        target_hits = sum(1 for t in closed_trades if "target_hit" in t.exit_reason)

        # Benchmark
        nifty_close = self._fetch_nifty(dates[0], dates[-1])
        nifty_ret = 0.0
        nifty_curve = None
        if len(nifty_close) >= 2:
            nifty_ret = (nifty_close.iloc[-1] / nifty_close.iloc[0] - 1) * 100
            nifty_curve = nifty_close / nifty_close.iloc[0] * INITIAL_CAPITAL

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
            target_hits=target_hits,
            partial_exits=partial_exit_count,
            sector_exits=sector_exit_count,
        )

        # Store diagnostics for later
        result._partial_hit_full = partial_hit_full_count
        result._partial_breakeven = partial_breakeven_count
        result._sector_exit_tickers = sector_exit_tickers

        return result

    def plot_equity_curve(self, result):
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), height_ratios=[3, 1],
                                        sharex=True, gridspec_kw={"hspace": 0.08})
        ax1.plot(result.equity_curve.index, result.equity_curve.values,
                 color="#2196F3", linewidth=1.5, label="Strategy")
        if result.nifty_curve is not None:
            ax1.plot(result.nifty_curve.index, result.nifty_curve.values,
                     color="#9E9E9E", linewidth=1.0, linestyle="--", label="Nifty 50 (B&H)")
        ax1.set_ylabel("Portfolio Value (Rs)")
        ax1.legend(loc="upper left")
        ax1.grid(True, alpha=0.3)
        ax1.set_title("Equity Curve vs Nifty 50 Benchmark")
        ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"{x:,.0f}"))
        ax2.fill_between(result.drawdown_series.index, result.drawdown_series.values * 100,
                         0, color="#F44336", alpha=0.4)
        ax2.set_ylabel("Drawdown (%)")
        ax2.set_xlabel("Date")
        ax2.grid(True, alpha=0.3)
        path = self.results_dir / "equity_curve.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"\n  Equity curve saved to {path}")

    def save_trade_log(self, result):
        path = self.results_dir / "trade_log.csv"
        result.trade_log.to_csv(path, index=False)
        print(f"  Trade log saved to {path}")

    @staticmethod
    def print_report(r):
        eq = "=" * 46
        ln = "-" * 46
        print(f"\n  +{eq}+")
        print(f"  |{'BACKTEST RESULTS':^46}|")
        print(f"  +{eq}+")
        print(f"  | Total Return    : {r.total_return_pct:>+8.1f}%{' '*17}|")
        print(f"  | Annualised      : {r.annualised_return_pct:>+8.1f}%{' '*17}|")
        print(f"  | Sharpe Ratio    : {r.sharpe_ratio:>8.2f}{' '*18}|")
        print(f"  | Max Drawdown    : {r.max_drawdown_pct:>8.1f}%{' '*17}|")
        print(f"  +{ln}+")
        print(f"  | Total Trades    : {r.total_trades:>8}{' '*18}|")
        print(f"  | Win Rate        : {r.win_rate_pct:>8.1f}%{' '*17}|")
        print(f"  | Avg Win         : {r.avg_win_pct:>+8.1f}%{' '*17}|")
        print(f"  | Avg Loss        : {r.avg_loss_pct:>+8.1f}%{' '*17}|")
        print(f"  | Profit Factor   : {r.profit_factor:>8.2f}{' '*18}|")
        print(f"  | Avg Hold Days   : {r.avg_hold_days:>8.1f}{' '*18}|")
        print(f"  +{ln}+")
        print(f"  | Stop Loss       : {r.stops_hit:>8}{' '*18}|")
        print(f"  | EMA Reversal    : {r.ema_reversals:>8}{' '*18}|")
        print(f"  | Target Hit      : {r.target_hits:>8}{' '*18}|")
        print(f"  | Partial Exits   : {r.partial_exits:>8}{' '*18}|")
        print(f"  | Sector Rotation : {r.sector_exits:>8}{' '*18}|")
        print(f"  +{eq}+")


def run_4way(start_date="2022-01-01", end_date="2026-03-24"):
    """Run 4-way backtest comparison with new exit rules."""
    configs = [
        ("A: Baseline",       dict(use_ml=True, use_hybrid=True, use_partial_profits=False, use_sector_rotation=False)),
        ("B: +Partial",       dict(use_ml=True, use_hybrid=True, use_partial_profits=True,  use_sector_rotation=False)),
        ("C: +SectorRot",     dict(use_ml=True, use_hybrid=True, use_partial_profits=False, use_sector_rotation=True)),
        ("D: +Both",          dict(use_ml=True, use_hybrid=True, use_partial_profits=True,  use_sector_rotation=True)),
    ]

    results = {}
    for label, kwargs in configs:
        print(f"\n{'#'*70}")
        print(f"  BACKTEST {label}")
        print(f"{'#'*70}")
        bt = Backtester(**kwargs)
        results[label] = bt.run(start_date, end_date)

    # ── 4-way comparison table ──────────────────────
    keys = list(results.keys())
    rs = [results[k] for k in keys]

    w = 78
    eq = "=" * w
    ln = "-" * w
    print(f"\n  +{eq}+")
    print(f"  |{'4-WAY BACKTEST COMPARISON':^{w}}|")
    print(f"  +{eq}+")
    hdr = f"  | {'Metric':<22}"
    for k in keys:
        hdr += f"{k.split(':')[0]:>13}"
    hdr += " |"
    print(hdr)
    print(f"  +{ln}+")

    metrics = [
        ("Total Return", [f"{r.total_return_pct:+.1f}%" for r in rs]),
        ("Annualised", [f"{r.annualised_return_pct:+.1f}%" for r in rs]),
        ("Sharpe Ratio", [f"{r.sharpe_ratio:.2f}" for r in rs]),
        ("Max Drawdown", [f"{r.max_drawdown_pct:.1f}%" for r in rs]),
        ("Total Trades", [f"{r.total_trades}" for r in rs]),
        ("Win Rate", [f"{r.win_rate_pct:.1f}%" for r in rs]),
        ("Avg Win", [f"{r.avg_win_pct:+.1f}%" for r in rs]),
        ("Avg Loss", [f"{r.avg_loss_pct:+.1f}%" for r in rs]),
        ("Profit Factor", [f"{r.profit_factor:.2f}" for r in rs]),
        ("Avg Hold Days", [f"{r.avg_hold_days:.1f}" for r in rs]),
        ("Partial Exits", [f"{r.partial_exits}" if r.partial_exits else "N/A" for r in rs]),
        ("Sector Exits", [f"{r.sector_exits}" if r.sector_exits else "N/A" for r in rs]),
        ("Target Hits", [f"{r.target_hits}" for r in rs]),
    ]
    for label, vals in metrics:
        row = f"  | {label:<22}"
        for v in vals:
            row += f"{v:>13}"
        row += " |"
        print(row)
    print(f"  +{eq}+")

    # ── Year-by-year for Backtest D ──────────────────
    rd = rs[-1]
    if rd.total_trades > 0 and len(rd.trade_log) > 0:
        print(f"\n  +{eq}+")
        print(f"  |{'BACKTEST D (FULL STRATEGY) -- YEAR BY YEAR':^{w}}|")
        print(f"  +{eq}+")
        print(f"  | {'Year':<6}{'Trades':>8}{'WinRate':>10}{'AvgRet':>10}{'TotalPnL':>14}{'Final':>14}{'DD':>12} |")
        print(f"  +{ln}+")

        tl = rd.trade_log.copy()
        tl["year"] = pd.to_datetime(tl["entry_date"]).dt.year
        for year in sorted(tl["year"].unique()):
            yt = tl[tl["year"] == year]
            n = len(yt)
            w_count = (yt["net_pnl"] > 0).sum()
            wr = w_count / n * 100 if n > 0 else 0
            ar = yt["return_pct"].mean()
            tp = yt["net_pnl"].sum()
            print(f"  | {year:<6}{n:>8}{wr:>9.1f}%{ar:>+9.2f}%{tp:>+13,.0f}{' ':>14}{' ':>12} |")
        print(f"  +{eq}+")

    # ── Deep diagnostics ─────────────────────────────
    if rd.total_trades > 0:
        print(f"\n  {'='*60}")
        print(f"  DEEP DIAGNOSTICS — Backtest D")
        print(f"  {'='*60}")

        # Partial profit analysis
        if rs[-1].partial_exits > 0:
            print(f"\n  Partial Profit Analysis:")
            print(f"    Trades that hit partial target: {rs[-1].partial_exits}")
            print(f"    Of those, hit full target:      {getattr(rs[-1], '_partial_hit_full', 0)}")
            print(f"    Stopped at breakeven:           {getattr(rs[-1], '_partial_breakeven', 0)}")
            partial_trades = [t for t in rd.trade_log.itertuples()
                              if 'target_hit_full' in str(t.exit_reason)]
            if partial_trades:
                avg_partial = np.mean([t.return_pct for t in partial_trades])
                print(f"    Avg return on full-target exits: {avg_partial:+.2f}%")

        # Sector rotation analysis
        if rs[-1].sector_exits > 0:
            sec_tickers = getattr(rs[-1], '_sector_exit_tickers', [])
            print(f"\n  Sector Rotation Analysis:")
            print(f"    Total sector rotation exits: {rs[-1].sector_exits}")
            from collections import Counter
            sec_counts = Counter(sec_tickers)
            print(f"    Most rotated-out sectors:")
            for sec, cnt in sec_counts.most_common(5):
                print(f"      {sec:<20s} {cnt} exits")

        # Exit reason breakdown
        tl = rd.trade_log
        print(f"\n  Exit Reason Breakdown:")
        for reason in tl["exit_reason"].unique():
            subset = tl[tl["exit_reason"] == reason]
            n = len(subset)
            avg_r = subset["return_pct"].mean()
            wr = (subset["net_pnl"] > 0).sum() / n * 100 if n > 0 else 0
            print(f"    {reason:<20s} {n:>4} trades  WR={wr:>5.1f}%  Avg={avg_r:>+6.2f}%")

        # Monthly trade frequency
        tl["month"] = pd.to_datetime(tl["entry_date"]).dt.to_period("M")
        monthly = tl.groupby("month").size()
        print(f"\n  Monthly Trade Frequency:")
        zero_months = 0
        for period in pd.period_range(tl["month"].min(), tl["month"].max(), freq="M"):
            count = monthly.get(period, 0)
            flag = " <-- NO TRADES" if count == 0 else ""
            if count == 0:
                zero_months += 1
            print(f"    {period}  {count:>3} trades{flag}")
        print(f"    Months with 0 trades: {zero_months}")

    # ── Save outputs ─────────────────────────────────
    if len(rd.trade_log) > 0:
        path = RESULTS_DIR / "backtest_7yr_full.csv"
        rd.trade_log.to_csv(path, index=False)
        print(f"\n  Trade log saved to {path}")

    eq_path = RESULTS_DIR / "backtest_7yr_equity.csv"
    eq_df = pd.DataFrame({"date": rd.equity_curve.index, "equity": rd.equity_curve.values})
    eq_df.to_csv(eq_path, index=False)
    print(f"  Equity curve saved to {eq_path}")

    return results


def run_comparison(start_date="2022-01-01", end_date="2026-03-24"):
    """Legacy 3-way comparison."""
    return run_4way(start_date, end_date)


if __name__ == "__main__":
    if "--4way" in sys.argv or "--compare" in sys.argv:
        run_4way()
    else:
        bt = Backtester(use_ml=True, use_hybrid=True)
        result = bt.run("2022-01-01", "2026-03-24")
        Backtester.print_report(result)
        bt.save_trade_log(result)
