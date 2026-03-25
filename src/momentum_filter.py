"""
Hybrid Engine: Momentum Filter
Scans the stock universe for momentum candidates using
technical indicators from pre-computed feature CSVs.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_DIR, RESULTS_DIR, ensure_dirs, get_sector

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"


class MomentumFilter:

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

    def get_watchlist(self, date=None):
        """
        Filter stocks for momentum on a given date.

        Parameters
        ----------
        date : str or None
            Date string (YYYY-MM-DD). Defaults to most recent trading day.

        Returns
        -------
        pd.DataFrame
            Watchlist sorted descending by momentum_score.
        """
        rows = []
        for ticker, df in self._cache.items():
            if date is not None:
                mask = df["Date"] <= pd.Timestamp(date)
                if mask.sum() == 0:
                    continue
                row = df.loc[mask].iloc[-1]
            else:
                row = df.iloc[-1]

            # ── Momentum filters ────────────────────────────
            if row.get("ema_21_above_50", 0) != 1:
                continue
            if row.get("price_vs_ema21_pct", 0) <= 0:
                continue
            if row.get("adx_14", 0) <= 25:
                continue
            if row.get("position_in_52w", 0) <= 0.5:
                continue
            if row.get("volume_ratio", 0) <= 0.8:
                continue

            adx = float(row.get("adx_14", 0))
            rsi = float(row.get("rsi_14", 0))
            pos52 = float(row.get("position_in_52w", 0))
            ema_gap = float(row.get("ema9_vs_ema21_pct", 0))

            score = (
                (adx / 100) * 0.3
                + pos52 * 0.3
                + (rsi / 100) * 0.2
                + (max(-5, min(5, ema_gap)) / 5) * 0.2
            )

            rows.append({
                "ticker": ticker,
                "close": float(row.get("Close", 0)),
                "adx_14": round(adx, 2),
                "rsi_14": round(rsi, 2),
                "position_in_52w": round(pos52, 4),
                "volume_ratio": round(float(row.get("volume_ratio", 0)), 2),
                "ema9_vs_ema21_pct": round(ema_gap, 4),
                "atr_14": round(float(row.get("atr_14", 0)), 4),
                "momentum_score": round(score, 4),
            })

        if not rows:
            return pd.DataFrame(columns=[
                "ticker", "close", "adx_14", "rsi_14",
                "position_in_52w", "volume_ratio",
                "ema9_vs_ema21_pct", "atr_14", "momentum_score",
            ])

        wl = pd.DataFrame(rows)
        wl = wl.sort_values("momentum_score", ascending=False).reset_index(drop=True)
        return wl

    def get_sector_breakdown(self, watchlist_df):
        """Return {sector: count} for watchlist stocks."""
        counts = {}
        for ticker in watchlist_df["ticker"]:
            sector = get_sector(ticker)
            counts[sector] = counts.get(sector, 0) + 1
        return dict(sorted(counts.items(), key=lambda x: -x[1]))


if __name__ == "__main__":
    mf = MomentumFilter()
    print(f"Loaded {len(mf._cache)} stocks from {mf.feature_dir}")

    wl = mf.get_watchlist()
    print(f"\n{'='*70}")
    print(f"MOMENTUM WATCHLIST — {len(wl)} stocks passed filters")
    print(f"{'='*70}")

    if len(wl) > 0:
        print(f"\nTop 20:")
        print(wl.head(20).to_string(index=False))

        breakdown = mf.get_sector_breakdown(wl)
        print(f"\nSector breakdown:")
        for sector, count in breakdown.items():
            print(f"  {sector:<20s} {count}")

        out = RESULTS_DIR / "watchlist_latest.csv"
        wl.to_csv(out, index=False)
        print(f"\nSaved {len(wl)} rows → {out}")
    else:
        print("No stocks passed momentum filters.")
