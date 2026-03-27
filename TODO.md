# NiftyQuant — Pre-Move Detection Engine: Status & Tech Debt

Last updated: 2026-03-27

## Latest Backtest Results (v2, lowered thresholds + regime)

```
Thresholds: STRONG >= 0.58, MODERATE >= 0.48, WEAK >= 0.40
Move required: 3.39% (3% + 0.39% trading costs)

Overall: 818 detections, 384 correct, 46.9% accuracy
Avg move: 4.0%  |  Avg time to move: 3.1 days

By Strength:   STRONG 146 (47.9%)  |  MODERATE 293 (42.0%)  |  WEAK 379 (50.4%)
By Direction:  BULLISH 159 (9.4%)  |  BEARISH 379 (51.5%)  |  NEUTRAL 280 (62.1%)

Signal Quality: High conviction (S+M) 44.0% vs Weak 50.4% → -6.4% edge
Interpretation: composite score does NOT predict accuracy in this dataset.
               BEARISH + NEUTRAL signals are the actionable ones.
               BULLISH accuracy is destroyed by the bearish sparkline period.

Live detections (current snapshot): 21 total (3 STRONG, 6 MODERATE, 12 WEAK)
```

## What Was Fixed

### 1. Fake Historical Accuracy → Real Sparkline Backtest
- **Before:** `getHistoricalAccuracy()` returned a 100% hardcoded object (847 detections, 61.7% accuracy — all fabricated)
- **After:** Real backtest engine that simulates detection at each day in the 30-day sparkline, checks if stock moved 3%+ (after costs) within 5 days in the predicted direction
- **File:** `src/utils/preMove.js`
- **Real results:** ~818 detections, ~46.9% overall accuracy, ~48.4% for MODERATE signals

### 2. Broken Institutional Footprint Signal → Working Proxy
- **Before:** Read `deliveryPct` which doesn't exist in stockData.json, fell back to 50, always returned 0
- **After:** Infers institutional activity from volumeRatio + dayChange + ADX + posIn52w (all available in stockData.json)
- **File:** `src/utils/preMove.js`, function `calcInstitutionalFootprint()`

### 3. Composite Score Overflow → Capped at 1.0
- **Before:** Some stocks showed >100% composite (e.g. ALKYLAMINE at 104%)
- **After:** `Math.min(1, ...)` safeguard on composite calculation + all individual signal functions already capped
- **File:** `src/utils/preMove.js`, function `scoreStock()`

### 4. Hardcoded api.js Overrides → Toggle
- **Before:** Real calculated metrics were unconditionally overwritten with hardcoded production values (WR 42.9%, PF 1.49, etc.)
- **After:** `USE_PRODUCTION_VALUES` flag at top of api.js — set to `false` by default so real CSV-derived values flow through
- **File:** `src/api.js`

### 5. Trading Costs Model Created
- **New file:** `src/utils/tradingCosts.js`
- **Covers:** Zerodha brokerage (0.03% / ₹20 cap), STT (0.1% sell), exchange (0.00345%), SEBI, GST, stamp duty, slippage (0.1%)
- **Estimated round-trip cost:** ~0.39% per trade
- **Integrated into:** Pre-Move accuracy backtest (threshold = 3% + 0.39% = 3.39%)

### 6. Hook Updated for Performance
- **Before:** Ran expensive backtest on every scan, with a fake 800ms `setTimeout`
- **After:** Caches backtest results (deterministic), separates fast detection from slow backtest, exposes `backtesting` loading state
- **File:** `src/hooks/usePreMoveDetection.js`

### 7. HistoricalAccuracy Component Updated
- Shows sample sizes per tier (e.g. "MODERATE (192)")
- Shows methodology note with threshold, cost basis, and data source
- Shows loading skeleton while backtest computes
- **File:** `src/components/premove/HistoricalAccuracy.jsx`

---

## What's Still Hardcoded / Fake

| Item | Location | Status |
|------|----------|--------|
| Demo portfolio holdings | `src/utils/zerodhaApi.js` `getDemoHoldings()` | Static mock data — needs real Kite API connection |
| Demo margins/positions | `src/utils/zerodhaApi.js` | Static mock data |
| Market news | `src/components/terminal/NewsWidget.jsx` | Hardcoded 7 items — needs news API |
| NSE index data fallback | `src/utils/nseApi.js` `getDemoIndices()` | Fallback when NSE proxy unavailable |
| Backtest page stat cards | `src/pages/Backtest.jsx` lines 71-76 | Hardcoded (43.2%, 0.67 Sharpe, etc.) |
| `production_strategy.json` values | `src/api.js` (behind `USE_PRODUCTION_VALUES` toggle) | Locked v3.0 numbers, now off by default |

---

## What's Working (Real Code + Real Data)

| Component | Data Source | Notes |
|-----------|------------|-------|
| Pre-Move 5-signal detection | `stockData.json` (363 stocks) | All 5 signals functional, real data |
| Pre-Move sparkline backtest | `stockData.json` sparkline (30 days) | Real accuracy calc with costs |
| Trading cost calculator | `tradingCosts.js` | Zerodha fee schedule |
| Backtest yearly/trade tables | `trade_log.csv` (362 trades) | Real from Python backtester |
| Equity curve chart | `comparison_equity.csv` | Real from Python backtester |
| Monthly returns heatmap | Derived from equity curve | Calculated |
| Risk metrics (Sharpe, Sortino, etc.) | `riskCalculations.js` | Correct implementations |
| P&L calculations | `pnlCalculations.js` | Correct implementations |
| Technical indicators | `indicators.js` | EMA, RSI, MACD, BB, ATR, ADX, VWAP |
| Sector mapping | `sectorMap.js` | 360+ stocks manually mapped |
| Stock search | `tickers.json` + `stockData.json` | Works |
| Zerodha API wrapper | `zerodhaApi.js` | Code complete, untested without API key |
| Password authentication | `auth/PasswordGate.jsx` | SHA-256 hash check |

---

## Remaining Tech Debt

### High Priority
- [ ] **Sparkline backtest is approximate** — uses price-derived proxy for RSI/BB/MACD since sparkline only has [date, close]. Real indicator values would require full OHLCV history.
- [ ] **Sector rotation signal is skipped in backtest** — `sectorScores` passed as empty `{}` for performance. Should compute per-day sector scores.
- [ ] **Only 30 days of history** — sparkline data covers 2026-02-10 to 2026-03-24. Real validation needs 2+ years of daily snapshots.
- [ ] **ADX and volumeRatio are static in backtest** — we reuse current-day values for all 30 days since sparkline doesn't have historical indicator data.

### Medium Priority
- [ ] **Connect Zerodha Kite API** — API wrapper exists, needs API key + redirect flow testing
- [ ] **Real-time NSE data** — requires CORS proxy or backend since NSE blocks browser requests
- [ ] **News API integration** — replace hardcoded news with live feed
- [ ] **Journal auto-sync** — match Zerodha executed trades with journal entries

### Low Priority
- [ ] **Chunk splitting** — main bundle is 1.1MB, should split recharts + stockData.json
- [ ] **Supabase migration** — move from localStorage to persistent DB for multi-device
- [ ] **Pre-Move ↔ Backtest integration** — run Pre-Move signals against historical trade_log to see overlap
