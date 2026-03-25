"""
Hybrid Engine: Dip Detector
Finds stocks from the momentum watchlist that have
temporarily pulled back — ready-to-buy candidates.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_DIR, RESULTS_DIR, ensure_dirs

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"


class DipDetector:

    def __init__(self, feature_dir=None):
        self.feature_dir = Path(feature_dir) if feature_dir else FEATURES_DIR
        self._cache = {}
        self._load_all()

    def _load_all(self):
        """Load feature CSVs for all available stocks."""
        self._cache.clear()
        for f in sorted(self.feature_dir.glob("*.csv")):
            ticker = f.stem.replace(".NS", "")
            try:
                df = pd.read_csv(f, parse_dates=["Date"])
                df = df.sort_values("Date").reset_index(drop=True)
                self._cache[ticker] = df
            except Exception:
                continue

    def _get_window(self, ticker, date, n_days):
        """Return the last n_days rows up to and including date."""
        df = self._cache.get(ticker)
        if df is None:
            return None
        if date is not None:
            mask = df["Date"] <= pd.Timestamp(date)
            df = df.loc[mask]
        if len(df) < n_days:
            return None
        return df.iloc[-n_days:]

    def scan(self, watchlist_df, date=None):
        """
        Scan watchlist for dip candidates.

        Parameters
        ----------
        watchlist_df : pd.DataFrame
            Output from MomentumFilter.get_watchlist().
        date : str or None
            Date string (YYYY-MM-DD). Defaults to most recent trading day.

        Returns
        -------
        pd.DataFrame
            Dip candidates with conviction scoring.
        """
        rows = []
        for _, wl_row in watchlist_df.iterrows():
            ticker = wl_row["ticker"]

            # Need at least 5 days of history for the lookback checks
            window5 = self._get_window(ticker, date, 5)
            if window5 is None:
                continue
            today = window5.iloc[-1]
            window3 = window5.iloc[-3:]

            rsi = float(today.get("rsi_14", 50))
            bb_pct = float(today.get("bb_pct", 0.5))
            ret5 = float(today.get("return_5d", 0))
            close = float(today.get("Close", 0))
            atr = float(today.get("atr_14", 0))
            row_date = str(today.get("Date", ""))[:10]

            # ── Condition A: RSI dip ─────────────────────
            rsi_dip = (
                rsi < 40
                or any(float(r.get("rsi_14", 50)) < 40 for _, r in window3.iterrows())
            )

            # ── Condition B: Bollinger dip ───────────────
            bb_dip = (
                bb_pct < 0.05
                or any(float(r.get("bb_pct", 0.5)) < 0.10 for _, r in window3.iterrows())
            )

            # ── Condition C: Red candle dip ──────────────
            red_count = sum(
                1 for _, r in window5.iterrows()
                if float(r.get("Close", 0)) < float(r.get("Open", 0))
            )
            red_dip = red_count >= 3 and ret5 < -3.0

            # ── Conviction ───────────────────────────────
            dip_count = sum([rsi_dip, bb_dip, red_dip])
            if dip_count == 0:
                continue

            conviction = "HIGH" if dip_count >= 2 else "MEDIUM"

            # ── Human-readable reason ────────────────────
            reasons = []
            if rsi_dip:
                reasons.append(f"RSI at {rsi:.1f}")
            if bb_dip:
                reasons.append(f"BB%: {bb_pct:.2f} (lower band)")
            if red_dip:
                reasons.append(f"{red_count} red candles / {ret5:.1f}%")
            dip_reason = " + ".join(reasons)
            if conviction == "HIGH":
                dip_reason += " (HIGH CONVICTION)"

            rows.append({
                "ticker": ticker,
                "date": row_date,
                "close": round(close, 2),
                "momentum_score": round(float(wl_row["momentum_score"]), 4),
                "rsi_14": round(rsi, 2),
                "bb_pct": round(bb_pct, 4),
                "return_5d": round(ret5, 2),
                "rsi_dip": rsi_dip,
                "bb_dip": bb_dip,
                "red_dip": red_dip,
                "dip_count": dip_count,
                "conviction": conviction,
                "dip_reason": dip_reason,
                "atr_14": round(atr, 4),
            })

        if not rows:
            return pd.DataFrame(columns=[
                "ticker", "date", "close", "momentum_score",
                "rsi_14", "bb_pct", "return_5d",
                "rsi_dip", "bb_dip", "red_dip",
                "dip_count", "conviction", "dip_reason", "atr_14",
            ])

        out = pd.DataFrame(rows)
        out = out.sort_values(
            ["dip_count", "momentum_score"], ascending=[False, False]
        ).reset_index(drop=True)
        return out


if __name__ == "__main__":
    from momentum_filter import MomentumFilter

    mf = MomentumFilter()
    dd = DipDetector()

    # ── Bull period test: 2024-09-15 ─────────────────────
    test_date = "2024-09-15"
    print(f"{'='*70}")
    print(f"DIP SCAN — {test_date}")
    print(f"{'='*70}")

    wl = mf.get_watchlist(date=test_date)
    print(f"Momentum watchlist: {len(wl)} stocks")

    dips = dd.scan(wl, date=test_date)
    print(f"Dip candidates:     {len(dips)} stocks\n")

    if len(dips) > 0:
        high = dips[dips["conviction"] == "HIGH"]
        med = dips[dips["conviction"] == "MEDIUM"]
        print(f"HIGH conviction: {len(high)}  |  MEDIUM conviction: {len(med)}\n")

        for _, r in dips.iterrows():
            print(
                f"  [{r['conviction']:6s}] {r['ticker']:<14s} "
                f"Rs {r['close']:>9.2f}  "
                f"mom={r['momentum_score']:.3f}  "
                f"dips={r['dip_count']}  "
                f"— {r['dip_reason']}"
            )

        out = RESULTS_DIR / "dip_candidates_latest.csv"
        dips.to_csv(out, index=False)
        print(f"\nSaved {len(dips)} rows -> {out}")
    else:
        print("No dip candidates found.")

    # ── Bear period test: latest date ────────────────────
    print(f"\n{'='*70}")
    print(f"DIP SCAN — latest date (bear market)")
    print(f"{'='*70}")

    wl2 = mf.get_watchlist()
    print(f"Momentum watchlist: {len(wl2)} stocks")
    dips2 = dd.scan(wl2)
    print(f"Dip candidates:     {len(dips2)} stocks")
    if len(dips2) == 0:
        print("No dip candidates (expected — bear market blocks momentum filter).")
