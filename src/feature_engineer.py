"""
Phase 2: Feature Engineering
Computes technical indicator features for all Nifty 500 stocks.
Usage: python src/feature_engineer.py [--force]
"""

import os
import sys
import logging
from pathlib import Path

import pandas as pd
import pandas_ta as ta

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_DIR, RESULTS_DIR, LOGS_DIR, NIFTY_500, ensure_dirs

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"
FEATURES_DIR.mkdir(parents=True, exist_ok=True)

WARMUP_ROWS = 60

logger = logging.getLogger("feature_engineer")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    from logging.handlers import RotatingFileHandler
    _h = RotatingFileHandler(LOGS_DIR / "data_errors.log", maxBytes=1_000_000, backupCount=3)
    _h.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(_h)


def _needs_recompute(ticker: str) -> bool:
    """Return True if features CSV is missing or older than raw CSV."""
    raw_path = DATA_DIR / f"{ticker}.NS.csv"
    feat_path = FEATURES_DIR / f"{ticker}.NS.csv"
    if not feat_path.exists():
        return True
    if not raw_path.exists():
        return False  # No raw data — can't compute anyway
    return os.path.getmtime(raw_path) > os.path.getmtime(feat_path)


class FeatureEngineer:

    def _load_ohlcv(self, ticker: str) -> pd.DataFrame:
        path = DATA_DIR / f"{ticker}.NS.csv"
        df = pd.read_csv(path, index_col="Date", parse_dates=True)
        df = df.dropna(subset=["Close"])
        return df

    # ── Group 1: Trend ───────────────────────────────────

    def _trend_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["ema_9"] = df["Close"].ewm(span=9, adjust=False).mean()
        df["ema_21"] = df["Close"].ewm(span=21, adjust=False).mean()
        df["ema_50"] = df["Close"].ewm(span=50, adjust=False).mean()

        df["ema_9_above_21"] = (df["ema_9"] > df["ema_21"]).astype(int)
        df["ema_21_above_50"] = (df["ema_21"] > df["ema_50"]).astype(int)

        above_prev = df["ema_9"].shift(1) > df["ema_21"].shift(1)
        above_now = df["ema_9"] > df["ema_21"]
        df["ema_cross_up"] = (~above_prev & above_now).astype(int)
        df["ema_cross_down"] = (above_prev & ~above_now).astype(int)

        df["price_vs_ema21_pct"] = (df["Close"] - df["ema_21"]) / df["ema_21"] * 100
        df["ema9_vs_ema21_pct"] = (df["ema_9"] - df["ema_21"]) / df["ema_21"] * 100

        adx_df = ta.adx(df["High"], df["Low"], df["Close"], length=14)
        df["adx_14"] = adx_df["ADX_14"]
        df["adx_above_25"] = (df["adx_14"] > 25).astype(int)
        df["adx_slope"] = df["adx_14"] - df["adx_14"].shift(3)

        return df

    # ── Group 2: Momentum ────────────────────────────────

    def _momentum_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["rsi_14"] = ta.rsi(df["Close"], length=14)
        df["rsi_above_50"] = (df["rsi_14"] > 50).astype(int)
        df["rsi_overbought"] = (df["rsi_14"] > 70).astype(int)
        df["rsi_oversold"] = (df["rsi_14"] < 30).astype(int)

        macd_df = ta.macd(df["Close"], fast=12, slow=26, signal=9)
        df["macd_line"] = macd_df["MACD_12_26_9"]
        df["macd_signal"] = macd_df["MACDs_12_26_9"]
        df["macd_histogram"] = macd_df["MACDh_12_26_9"]
        df["macd_above_signal"] = (df["macd_line"] > df["macd_signal"]).astype(int)

        df["roc_10"] = (df["Close"] - df["Close"].shift(10)) / df["Close"].shift(10) * 100

        stoch_df = ta.stoch(df["High"], df["Low"], df["Close"], k=14, d=3)
        df["stoch_k"] = stoch_df["STOCHk_14_3_3"]
        df["stoch_d"] = stoch_df["STOCHd_14_3_3"]
        df["stoch_above_50"] = (df["stoch_k"] > 50).astype(int)

        return df

    # ── Group 3: Volatility ──────────────────────────────

    def _volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        bb_df = ta.bbands(df["Close"], length=20, std=2)
        df["bb_lower"] = bb_df["BBL_20_2.0_2.0"]
        df["bb_middle"] = bb_df["BBM_20_2.0_2.0"]
        df["bb_upper"] = bb_df["BBU_20_2.0_2.0"]
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["bb_middle"] * 100
        bb_range = df["bb_upper"] - df["bb_lower"]
        df["bb_pct"] = (df["Close"] - df["bb_lower"]) / bb_range.replace(0, float("nan"))
        df["bb_squeeze"] = (df["bb_width"] < df["bb_width"].rolling(50).mean()).astype(int)

        df["atr_14"] = ta.atr(df["High"], df["Low"], df["Close"], length=14)
        df["atr_pct"] = df["atr_14"] / df["Close"] * 100

        return df

    # ── Group 4: Volume ──────────────────────────────────

    def _volume_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["obv"] = ta.obv(df["Close"], df["Volume"])
        df["obv_ema"] = df["obv"].ewm(span=21, adjust=False).mean()
        df["obv_above_ema"] = (df["obv"] > df["obv_ema"]).astype(int)

        vol_ma20 = df["Volume"].rolling(20).mean()
        df["volume_ratio"] = df["Volume"] / vol_ma20.replace(0, float("nan"))
        df["volume_spike"] = (df["volume_ratio"] > 2.0).astype(int)

        return df

    # ── Group 5: Price Action ────────────────────────────

    def _price_action_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["return_1d"] = df["Close"].pct_change() * 100
        df["return_5d"] = df["Close"].pct_change(5) * 100
        df["return_10d"] = df["Close"].pct_change(10) * 100
        df["return_20d"] = df["Close"].pct_change(20) * 100

        df["hl_range_pct"] = (df["High"] - df["Low"]) / df["Close"] * 100
        df["body_pct"] = (df["Close"] - df["Open"]).abs() / df["Close"] * 100

        return df

    # ── Group 6: Support & Resistance ────────────────────

    def _support_resistance_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["high_52w"] = df["High"].rolling(252, min_periods=1).max()
        df["low_52w"] = df["Low"].rolling(252, min_periods=1).min()
        df["dist_from_52w_high"] = (df["Close"] - df["high_52w"]) / df["high_52w"] * 100
        df["dist_from_52w_low"] = (df["Close"] - df["low_52w"]) / df["low_52w"] * 100
        hl_range = (df["high_52w"] - df["low_52w"]).replace(0, float("nan"))
        df["position_in_52w"] = (df["Close"] - df["low_52w"]) / hl_range

        return df

    # ── Target Label ─────────────────────────────────────

    def _target_label(self, df: pd.DataFrame) -> pd.DataFrame:
        df["future_return_10d"] = (df["Close"].shift(-10) - df["Close"]) / df["Close"] * 100
        df["target"] = (df["future_return_10d"] > 2.0).astype(float)
        df.loc[df["future_return_10d"].isna(), "target"] = float("nan")
        return df

    # ── Validation ───────────────────────────────────────

    def _validate(self, df: pd.DataFrame, ticker: str) -> list[str]:
        warnings = []
        feature_cols = [c for c in df.columns if c not in ("future_return_10d", "target")]
        for col in feature_cols:
            nan_pct = df[col].isna().sum() / len(df)
            if nan_pct > 0.05:
                msg = f"{ticker}: {col} has {nan_pct:.1%} NaN after warmup drop"
                warnings.append(msg)
                logger.warning(msg)
        return warnings

    # ── Public API ───────────────────────────────────────

    def compute(self, ticker: str) -> pd.DataFrame:
        df = self._load_ohlcv(ticker)

        df = self._trend_features(df)
        df = self._momentum_features(df)
        df = self._volatility_features(df)
        df = self._volume_features(df)
        df = self._price_action_features(df)
        df = self._support_resistance_features(df)
        df = self._target_label(df)

        df = df.iloc[WARMUP_ROWS:]

        num_cols = df.select_dtypes(include="number").columns
        df[num_cols] = df[num_cols].round(4)

        self._validate(df, ticker)

        out_path = FEATURES_DIR / f"{ticker}.NS.csv"
        df.to_csv(out_path)

        return df

    def compute_all(self, force: bool = False) -> pd.DataFrame:
        tickers = NIFTY_500
        total = len(tickers)

        print(f"\n{'='*70}")
        print(f"  Feature Engineering — {total} stocks"
              f"{' (force recompute)' if force else ''}")
        print(f"{'='*70}\n")

        report_rows = []
        all_targets = []
        computed = 0
        skipped = 0
        failed = 0

        for i, ticker in enumerate(tickers):
            # Check if raw data exists
            raw_path = DATA_DIR / f"{ticker}.NS.csv"
            if not raw_path.exists():
                failed += 1
                report_rows.append({
                    "Ticker": ticker, "Total_Rows": 0, "Feature_Rows": 0,
                    "NaN_target_rows": 0, "Any_warnings": "no raw data",
                    "Status": "ERROR",
                })
                if (i + 1) % 25 == 0 or i == total - 1:
                    print(f"  Computing features... {i+1}/{total} ({(i+1)*100//total}%)")
                continue

            # Skip if features are fresh
            if not force and not _needs_recompute(ticker):
                try:
                    df = pd.read_csv(FEATURES_DIR / f"{ticker}.NS.csv",
                                     index_col="Date", parse_dates=True)
                    nan_target = df["target"].isna().sum()
                    warnings = self._validate(df, ticker)
                    status = "WARN" if warnings else "OK"
                    report_rows.append({
                        "Ticker": ticker,
                        "Total_Rows": len(df) + WARMUP_ROWS,
                        "Feature_Rows": len(df),
                        "NaN_target_rows": nan_target,
                        "Any_warnings": "; ".join(warnings) if warnings else "",
                        "Status": status,
                    })
                    all_targets.append(df["target"].dropna())
                    skipped += 1
                except Exception:
                    pass  # Fall through to recompute
                else:
                    if (i + 1) % 25 == 0 or i == total - 1:
                        print(f"  Computing features... {i+1}/{total} ({(i+1)*100//total}%)")
                    continue

            # Compute
            try:
                df = self.compute(ticker)
                nan_target = df["target"].isna().sum()
                warnings = self._validate(df, ticker)
                status = "WARN" if warnings else "OK"
                report_rows.append({
                    "Ticker": ticker,
                    "Total_Rows": len(df) + WARMUP_ROWS,
                    "Feature_Rows": len(df),
                    "NaN_target_rows": nan_target,
                    "Any_warnings": "; ".join(warnings) if warnings else "",
                    "Status": status,
                })
                all_targets.append(df["target"].dropna())
                computed += 1
            except Exception as e:
                msg = f"{ticker}: feature computation failed — {e}"
                logger.error(msg)
                failed += 1
                report_rows.append({
                    "Ticker": ticker, "Total_Rows": 0, "Feature_Rows": 0,
                    "NaN_target_rows": 0, "Any_warnings": str(e), "Status": "ERROR",
                })

            if (i + 1) % 25 == 0 or i == total - 1:
                print(f"  Computing features... {i+1}/{total} ({(i+1)*100//total}%)")

        report = pd.DataFrame(report_rows)

        ok = (report["Status"] == "OK").sum()
        warn = (report["Status"] == "WARN").sum()
        err = (report["Status"] == "ERROR").sum()

        print(f"\n{'='*70}")
        print(f"  SUMMARY: {computed} computed / {skipped} skipped (fresh) / {failed} failed")
        print(f"  Health:  {ok} OK / {warn} WARN / {err} ERROR out of {len(report)}")
        print(f"{'='*70}")

        # Show warnings
        warned = report[report["Status"] == "WARN"]
        if len(warned) > 0:
            print(f"\n  Tickers with warnings:")
            for _, row in warned.iterrows():
                print(f"    {row['Ticker']}: {row['Any_warnings']}")

        # Save report
        report_path = RESULTS_DIR / "feature_health.csv"
        report.to_csv(report_path, index=False)
        print(f"\n  Report saved to {report_path}")

        # Class balance
        if all_targets:
            combined = pd.concat(all_targets)
            total_labels = len(combined)
            ones = int(combined.sum())
            zeros = total_labels - ones
            print(f"\n  Target class balance across all stocks:")
            print(f"    target=1 (buy):  {ones:,} ({ones/total_labels:.1%})")
            print(f"    target=0 (skip): {zeros:,} ({zeros/total_labels:.1%})")
            print(f"    Total labelled:  {total_labels:,}")
            print(f"    Total rows (incl NaN target): "
                  f"{sum(r['Feature_Rows'] for r in report_rows if r['Feature_Rows'] > 0):,}")

        print()
        return report

    def load(self, ticker: str) -> pd.DataFrame:
        path = FEATURES_DIR / f"{ticker}.NS.csv"
        return pd.read_csv(path, index_col="Date", parse_dates=True)


if __name__ == "__main__":
    force = "--force" in sys.argv
    fe = FeatureEngineer()
    fe.compute_all(force=force)
