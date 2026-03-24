"""
Phase 1: NSE Data Fetcher
Fetches and caches daily OHLCV data for Nifty 500 stocks via yfinance.
Includes batch downloading, retry logic, data quality validation,
error logging, and health reporting.
"""

import time
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf

from config import (
    DATA_DIR, LOGS_DIR, RESULTS_DIR, NIFTY_500, NSE_HOLIDAYS,
    LOOKBACK_YEARS, ensure_dirs,
)

# ── Logging setup ────────────────────────────────────────
ensure_dirs()

logger = logging.getLogger("data_fetcher")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    _handler = RotatingFileHandler(
        LOGS_DIR / "data_errors.log", maxBytes=1_000_000, backupCount=3
    )
    _handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(_handler)

BATCH_SIZE = 50
BATCH_SLEEP = 2.0
TICKER_SLEEP = 0.5
RETRY_SLEEP = 3.0


# ── Helpers ──────────────────────────────────────────────

def _is_trading_day(dt: datetime) -> bool:
    if dt.weekday() >= 5:
        return False
    return dt.strftime("%Y-%m-%d") not in NSE_HOLIDAYS


def _trading_days_behind(last_date: datetime, ref_date: datetime) -> int:
    count = 0
    d = last_date + timedelta(days=1)
    while d <= ref_date:
        if _is_trading_day(d):
            count += 1
        d += timedelta(days=1)
    return count


def _is_cache_fresh(cache_path, max_age_days=2) -> bool:
    """Check if CSV exists and its last data row is within max_age_days of today."""
    if not cache_path.exists():
        return False
    try:
        # Read just the last line efficiently
        df = pd.read_csv(cache_path, index_col="Date", parse_dates=True)
        if df.empty:
            return False
        last_date = df.index[-1].to_pydatetime()
        days_behind = _trading_days_behind(last_date, datetime.now())
        return days_behind <= max_age_days
    except Exception:
        return False


# ── DataFetcher ──────────────────────────────────────────

class DataFetcher:
    def __init__(self, period: str = f"{LOOKBACK_YEARS}y"):
        self.data_dir = DATA_DIR
        self.period = period
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, ticker: str):
        return self.data_dir / f"{ticker}.NS.csv"

    def _clean(self, df: pd.DataFrame, ticker: str) -> pd.DataFrame:
        if df.empty:
            return df
        if isinstance(df.columns, pd.MultiIndex):
            df = df.droplevel("Ticker", axis=1)
        df.index = pd.to_datetime(df.index).tz_localize(None)
        close_raw = df["Close"].round(2).copy()
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df = df.ffill()
        df[["Open", "High", "Low", "Close"]] = df[["Open", "High", "Low", "Close"]].round(2)
        df["Volume"] = df["Volume"].astype(int)
        df["Close_Raw"] = close_raw
        df.index.name = "Date"
        return df

    def _validate(self, df: pd.DataFrame, ticker: str) -> str:
        status = "OK"
        if len(df) < 100:
            logger.warning(f"{ticker}: insufficient history ({len(df)} rows)")
            return "WARN"

        missing_pct = df["Close"].isna().sum() / len(df)
        if missing_pct > 0.10:
            logger.warning(f"{ticker}: {missing_pct:.1%} missing Close values")
            status = "WARN"

        daily_ret = df["Close"].pct_change().abs()
        spikes = daily_ret[daily_ret > 0.50]
        if not spikes.empty:
            for date, ret in spikes.items():
                logger.warning(f"{ticker}: {ret:.1%} move on {date.date()}")
            status = "WARN"

        zero_vol = df["Volume"] == 0
        if zero_vol.any():
            streak = max_streak = 0
            for v in zero_vol:
                streak = streak + 1 if v else 0
                max_streak = max(max_streak, streak)
            if max_streak > 5:
                logger.warning(f"{ticker}: {max_streak} consecutive zero-volume days")
                status = "WARN"

        return status

    def _download_one(self, ticker: str) -> pd.DataFrame:
        """Download with one retry on failure."""
        symbol = f"{ticker}.NS"
        for attempt in range(2):
            try:
                raw = yf.download(symbol, period=self.period, progress=False)
                df = self._clean(raw, ticker)
                if not df.empty:
                    return df
            except Exception as e:
                if attempt == 0:
                    logger.warning(f"{ticker}: attempt 1 failed ({e}), retrying...")
                    time.sleep(RETRY_SLEEP)
                else:
                    logger.error(f"{ticker}: fetch failed after retry — {e}")
        return pd.DataFrame()

    def fetch(self, ticker: str, force: bool = False) -> tuple[pd.DataFrame, str]:
        cache = self._cache_path(ticker)
        if cache.exists() and not force:
            df = pd.read_csv(cache, index_col="Date", parse_dates=True)
            status = self._validate(df, ticker)
            return df, status

        df = self._download_one(ticker)
        if df.empty:
            msg = f"{ticker}: no data returned from yfinance"
            logger.error(msg)
            return df, "ERROR"

        df.to_csv(cache)
        status = self._validate(df, ticker)
        return df, status

    def get(self, ticker: str, force: bool = False) -> pd.DataFrame:
        df, _ = self.fetch(ticker, force=force)
        return df

    def get_multiple(self, tickers: list[str], force: bool = False) -> dict[str, pd.DataFrame]:
        results = {}
        for i, t in enumerate(tickers):
            df, _ = self.fetch(t, force=force)
            results[t] = df
            if i < len(tickers) - 1:
                time.sleep(TICKER_SLEEP)
        return results

    def update_all(self, force: bool = False) -> pd.DataFrame:
        today = datetime.now()
        tickers = NIFTY_500
        total = len(tickers)

        if not _is_trading_day(today):
            reason = "weekend" if today.weekday() >= 5 else "NSE holiday"
            print(f"\nMarket closed today ({reason}). Skipping fetch.\n")
            logger.info(f"Skipped update_all — {reason}")

        print(f"\n{'='*70}")
        print(f"  NSE Data Update — {today.strftime('%Y-%m-%d %H:%M')}")
        print(f"  Fetching {total} Nifty 500 stocks ({self.period} history)")
        print(f"{'='*70}\n")

        report_rows = []
        failed_tickers = []
        fetched = 0
        skipped = 0
        failed = 0

        for i, ticker in enumerate(tickers):
            cache = self._cache_path(ticker)

            # Smart cache check — skip if fresh enough
            if not force and _is_cache_fresh(cache):
                df = pd.read_csv(cache, index_col="Date", parse_dates=True)
                status = self._validate(df, ticker)
                skipped += 1
            else:
                # Download
                df = self._download_one(ticker)
                if df.empty:
                    failed += 1
                    failed_tickers.append(ticker)
                    report_rows.append({
                        "Ticker": ticker, "Rows": 0, "Date_From": None,
                        "Date_To": None, "Missing%": 100.0, "Status": "ERROR",
                    })
                    # Progress
                    if (i + 1) % 10 == 0 or i == total - 1:
                        print(f"  Fetching... {i+1}/{total} ({(i+1)*100//total}%)"
                              f" — {failed} failed so far")
                    # Rate limit
                    if (i + 1) % BATCH_SIZE == 0:
                        time.sleep(BATCH_SLEEP)
                    else:
                        time.sleep(TICKER_SLEEP)
                    continue

                df.to_csv(cache)
                status = self._validate(df, ticker)
                fetched += 1

            # Build report row
            if not df.empty:
                missing_pct = round(df["Close"].isna().sum() / len(df) * 100, 1)
                report_rows.append({
                    "Ticker": ticker,
                    "Rows": len(df),
                    "Date_From": df.index[0].strftime("%Y-%m-%d"),
                    "Date_To": df.index[-1].strftime("%Y-%m-%d"),
                    "Missing%": missing_pct,
                    "Status": status,
                })

                # Freshness check
                days_behind = _trading_days_behind(
                    df.index[-1].to_pydatetime(), today)
                if days_behind > 2:
                    logger.warning(f"{ticker}.NS is {days_behind} trading days stale")

            # Progress
            if (i + 1) % 10 == 0 or i == total - 1:
                print(f"  Fetching... {i+1}/{total} ({(i+1)*100//total}%)"
                      f" — {failed} failed so far")

            # Rate limit between batches
            if (i + 1) % BATCH_SIZE == 0:
                time.sleep(BATCH_SLEEP)
            elif not force and _is_cache_fresh(cache):
                pass  # No sleep needed for cache hits
            else:
                time.sleep(TICKER_SLEEP)

        # Build report
        report = pd.DataFrame(report_rows)

        ok = (report["Status"] == "OK").sum() if len(report) > 0 else 0
        warn = (report["Status"] == "WARN").sum() if len(report) > 0 else 0
        err = (report["Status"] == "ERROR").sum() if len(report) > 0 else 0

        print(f"\n{'='*70}")
        print(f"  SUMMARY: {fetched} fetched / {skipped} skipped (fresh) / {failed} failed")
        print(f"  Health:  {ok} OK / {warn} WARN / {err} ERROR out of {len(report)}")
        print(f"{'='*70}")

        # Save reports
        report_path = RESULTS_DIR / "data_health.csv"
        report.to_csv(report_path, index=False)
        print(f"  Report saved to {report_path}")

        # Save failed tickers
        failed_path = RESULTS_DIR / "failed_tickers.txt"
        with open(failed_path, "w") as f:
            for t in failed_tickers:
                f.write(t + "\n")
        if failed_tickers:
            print(f"  Failed tickers ({len(failed_tickers)}) saved to {failed_path}")
            print(f"  Failed: {', '.join(failed_tickers[:20])}"
                  f"{'...' if len(failed_tickers) > 20 else ''}")

        print()
        return report


if __name__ == "__main__":
    fetcher = DataFetcher()
    fetcher.update_all(force=False)
