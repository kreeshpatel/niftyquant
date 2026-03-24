"""
Upgrade 1B: Regime Detection Module
Classifies market environment as BULL, BEAR, or CHOPPY.
"""

import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd
import pandas_ta as ta
import yfinance as yf

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    DATA_DIR, RESULTS_DIR, NIFTY_500, ensure_dirs,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"


@dataclass
class RegimeResult:
    regime: str
    confidence: float
    nsei_ema_trend: str
    rsi_signal: float
    breadth_ratio: float
    vix_level: float
    signals_bull: int
    signals_bear: int
    date: str


class RegimeDetector:

    def __init__(self):
        self.nsei_path = DATA_DIR / "NSEI.csv"
        self.vix_path = DATA_DIR / "INDIAVIX.csv"
        self.nsei = None
        self.vix = None

    def _fetch_index(self, symbol: str, path: Path) -> pd.DataFrame:
        """Fetch or load cached index data."""
        need_fetch = True
        if path.exists():
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            if not df.empty and (datetime.now() - df.index[-1].to_pydatetime()).days <= 2:
                need_fetch = False
            else:
                df = None

        if need_fetch:
            raw = yf.download(symbol, period="5y", progress=False)
            if raw.empty:
                if path.exists():
                    return pd.read_csv(path, index_col="Date", parse_dates=True)
                return pd.DataFrame()
            if isinstance(raw.columns, pd.MultiIndex):
                raw = raw.droplevel("Ticker", axis=1)
            raw.index = pd.to_datetime(raw.index).tz_localize(None)
            df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
            df.index.name = "Date"
            df.to_csv(path)

        return df

    def _load_data(self):
        if self.nsei is None:
            self.nsei = self._fetch_index("^NSEI", self.nsei_path)
        if self.vix is None:
            self.vix = self._fetch_index("INDIAVIX.NS", self.vix_path)

    def _compute_breadth(self, date: pd.Timestamp) -> float:
        """Fraction of stocks with Close > EMA21 on given date."""
        above = 0
        total = 0
        for ticker in NIFTY_500:
            path = FEATURES_DIR / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            try:
                df = pd.read_csv(path, index_col="Date", parse_dates=True)
                if date not in df.index:
                    continue
                row = df.loc[date]
                if pd.notna(row.get("ema_21")) and pd.notna(row.get("Close")):
                    total += 1
                    if row["Close"] > row["ema_21"]:
                        above += 1
            except Exception:
                continue
        return above / total if total > 0 else 0.5

    def detect(self, date=None) -> RegimeResult:
        self._load_data()

        if self.nsei.empty:
            return RegimeResult("CHOPPY", 0.0, "unknown", 0.0, 0.5, 15.0, 0, 0,
                                str(datetime.now().date()))

        if date is None:
            date = self.nsei.index[-1]
        else:
            date = pd.Timestamp(date)

        nsei = self.nsei[self.nsei.index <= date]
        if len(nsei) < 50:
            return RegimeResult("CHOPPY", 0.0, "insufficient data", 0.0, 0.5, 15.0, 0, 0,
                                str(date.date()))

        # Compute indicators
        close = nsei["Close"]
        ema21 = close.ewm(span=21, adjust=False).mean().iloc[-1]
        ema50 = close.ewm(span=50, adjust=False).mean().iloc[-1]
        rsi14 = ta.rsi(close, length=14).iloc[-1]
        ret20d = (close.iloc[-1] / close.iloc[-20] - 1) * 100 if len(close) >= 20 else 0.0
        adx_df = ta.adx(nsei["High"], nsei["Low"], nsei["Close"], length=14)
        adx14 = adx_df["ADX_14"].iloc[-1] if adx_df is not None else 20.0

        breadth = self._compute_breadth(date)

        # VIX
        vix_val = 15.0
        vix_ema10 = 15.0
        if self.vix is not None and not self.vix.empty:
            vix_sub = self.vix[self.vix.index <= date]
            if not vix_sub.empty:
                vix_val = float(vix_sub["Close"].iloc[-1])
                vix_ema10 = float(vix_sub["Close"].ewm(span=10, adjust=False).mean().iloc[-1])

        ema_trend = "UP" if ema21 > ema50 else "DOWN"

        # Bull conditions
        bull_conds = [
            ema21 > ema50,
            rsi14 > 50,
            ret20d > 2.0,
            breadth > 0.55,
            vix_val < 18,
        ]
        n_bull = sum(bull_conds)

        # Bear conditions
        bear_conds = [
            ema21 < ema50,
            rsi14 < 45,
            ret20d < -3.0,
            breadth < 0.35,
            vix_val > 22,
        ]
        n_bear = sum(bear_conds)

        # Classify
        if all(bull_conds):
            regime = "BULL"
            confidence = 1.0
        elif n_bear >= 3:
            regime = "BEAR"
            confidence = n_bear / 5.0
        elif adx14 < 20:
            regime = "CHOPPY"
            confidence = 0.5
        else:
            regime = "CHOPPY"
            confidence = 0.4

        return RegimeResult(
            regime=regime,
            confidence=round(confidence, 2),
            nsei_ema_trend=ema_trend,
            rsi_signal=round(float(rsi14), 1),
            breadth_ratio=round(breadth, 3),
            vix_level=round(vix_val, 1),
            signals_bull=n_bull,
            signals_bear=n_bear,
            date=str(date.date()),
        )

    def detect_all(self) -> pd.DataFrame:
        """Compute regime for every trading day in history."""
        self._load_data()
        if self.nsei.empty:
            return pd.DataFrame()

        nsei = self.nsei.copy()
        close = nsei["Close"]
        nsei["ema21"] = close.ewm(span=21, adjust=False).mean()
        nsei["ema50"] = close.ewm(span=50, adjust=False).mean()
        nsei["rsi14"] = ta.rsi(close, length=14)
        nsei["ret20d"] = close.pct_change(20) * 100
        adx_df = ta.adx(nsei["High"], nsei["Low"], nsei["Close"], length=14)
        nsei["adx14"] = adx_df["ADX_14"]

        # VIX merge
        if self.vix is not None and not self.vix.empty:
            nsei["vix"] = self.vix["Close"].reindex(nsei.index).ffill()
        else:
            nsei["vix"] = 15.0

        rows = []
        for date in nsei.index[60:]:  # Skip warmup
            row = nsei.loc[date]
            ema21 = row["ema21"]
            ema50 = row["ema50"]
            rsi = row["rsi14"]
            ret = row["ret20d"]
            adx = row["adx14"]
            vix = row["vix"]

            n_bull = sum([ema21 > ema50, rsi > 50, ret > 2.0, vix < 18])
            n_bear = sum([ema21 < ema50, rsi < 45, ret < -3.0, vix > 22])

            if n_bull >= 4:
                regime = "BULL"
                conf = n_bull / 5.0
            elif n_bear >= 3:
                regime = "BEAR"
                conf = n_bear / 5.0
            elif adx < 20:
                regime = "CHOPPY"
                conf = 0.5
            else:
                regime = "CHOPPY"
                conf = 0.4

            rows.append({
                "Date": date, "Regime": regime,
                "Confidence": round(conf, 2),
                "Breadth": 0.0,  # Skip full breadth calc for speed
                "VIX": round(float(vix), 1),
            })

        df = pd.DataFrame(rows).set_index("Date")
        return df


if __name__ == "__main__":
    det = RegimeDetector()

    print("Detecting today's regime...")
    result = det.detect()
    print(f"\n  Regime: {result.regime} (confidence: {result.confidence:.0%})")
    print(f"  VIX: {result.vix_level} | Breadth: {result.breadth_ratio:.1%} | "
          f"RSI: {result.rsi_signal} | EMA trend: {result.nsei_ema_trend}")
    print(f"  Bull signals: {result.signals_bull}/5 | Bear signals: {result.signals_bear}/5")

    print("\nComputing regime history...")
    hist = det.detect_all()
    hist_path = RESULTS_DIR / "regime_history.csv"
    hist.to_csv(hist_path)
    print(f"  Saved {len(hist)} days to {hist_path}")
    print(f"\n  Regime distribution:")
    print(hist["Regime"].value_counts().to_string())
