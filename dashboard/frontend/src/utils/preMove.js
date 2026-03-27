/**
 * Pre-Move Detection Algorithm v3 — Volatility Alert Mode
 *
 * Detects stocks about to experience significant volatility (3%+ move
 * in either direction within 5 days). Does NOT predict direction —
 * uses market regime as a secondary directional hint only.
 *
 * 5 signals, optimised weights from grid search over 15k combinations:
 * 1. Volume Accumulation (35%) — best solo predictor, 62.9% accuracy
 * 2. Institutional Footprint (30%) — strongest edge contributor
 * 3. Sector Rotation (20%) — good diversifier
 * 4. Volatility Squeeze (10%) — fires too broadly at higher weights
 * 5. Momentum Divergence (5%) — weakest in backtest
 *
 * Backtest: direction-free mode with these weights achieved +16-21% edge
 * (STRONG+MODERATE accuracy vs WEAK accuracy).
 */

import stockData from '../data/stockData.json'
import { getSector } from '../data/sectorMap'
import backtestResults from '../data/premove_backtest_results.json'

// ── Optimised weights (sum to 1.0) ──────────────
// Source: grid search over 15,000 combos, maximising edge
// between STRONG+MODERATE accuracy vs WEAK accuracy
const WEIGHTS = {
  volumeAccumulation: 0.35,
  institutionalFootprint: 0.30,
  sectorRotation: 0.20,
  volatilitySqueeze: 0.10,
  momentumDivergence: 0.05,
}

// ── Classification thresholds ────────────────────
const THRESHOLDS = {
  STRONG: 0.58,
  MODERATE: 0.48,
  WEAK: 0.40,
}

// ── Backtest parameters ──────────────────────────
const BACKTEST = {
  MOVE_THRESHOLD_PCT: 3.0,
  LOOKAHEAD_DAYS: 5,
  INCLUDE_COSTS: true,
  MIN_SAMPLE_SIZE: 30,
}

// ── Signal calculations ─────────────────────────

function calcVolumeAccumulation(stock) {
  const vr = stock.volumeRatio || 1
  if (vr < 1.2) return 0
  const priceChange = Math.abs(stock.dayChange || 0)
  if (priceChange > 2) return Math.min(1, Math.max(0, (vr - 1) * 0.3))
  return Math.min(1, (vr - 1) / 2)
}

function calcVolatilitySqueeze(stock) {
  const bbPct = stock.bbPct
  if (bbPct === undefined || bbPct === null) return 0
  if (bbPct > 0.6) return 0
  if (bbPct < 0.1) return 1
  return Math.min(1, 1 - (bbPct / 0.6))
}

function calcMomentumDivergence(stock) {
  const rsi = stock.rsi || 50
  const macdHist = stock.macdHist || 0
  const priceChange = Math.abs(stock.dayChange || 0)
  let score = 0
  if (priceChange < 1) {
    if (rsi > 55) score += (rsi - 55) / 45 * 0.5
    if (rsi < 35) score += (35 - rsi) / 35 * 0.5
  }
  if (macdHist > 0 && priceChange < 1) score += Math.min(0.5, macdHist / 2)
  return Math.min(1, score)
}

function calcInstitutionalFootprint(stock) {
  const vr = stock.volumeRatio || 1
  const priceChange = Math.abs(stock.dayChange || 0)
  const adx = stock.adx || 0
  const posIn52w = stock.posIn52w || 0.5
  let score = 0
  if (vr > 1.5 && priceChange < 1) score += 0.4
  else if (vr > 1.3 && priceChange < 0.5) score += 0.25
  if (adx > 25 && vr > 1.3) score += 0.3
  else if (adx > 20 && vr > 1.5) score += 0.15
  if (posIn52w > 0.8 && vr > 1.2) score += 0.2
  if (vr > 2.5 && priceChange < 1.5) score += 0.2
  return Math.min(1, score)
}

function calcSectorRotation(stock, sectorScores) {
  return Math.min(1, Math.max(0, sectorScores[getSector(stock.ticker || '')] || 0))
}

// ── Sector scoring ──────────────────────────────
function computeSectorScores() {
  const sectors = {}
  Object.entries(stockData).forEach(([ticker, data]) => {
    const sector = getSector(ticker)
    if (!sectors[sector]) sectors[sector] = { totalMom: 0, count: 0, volumeSum: 0 }
    sectors[sector].totalMom += (data.rsi > 50 ? 1 : 0) + (data.ema9Above21 ? 0.5 : 0) + (data.inMomentum ? 0.5 : 0)
    sectors[sector].volumeSum += (data.volumeRatio || 1)
    sectors[sector].count++
  })
  const scores = {}
  Object.entries(sectors).forEach(([sector, data]) => {
    const avgMom = data.totalMom / data.count
    const avgVol = data.volumeSum / data.count
    scores[sector] = Math.min(1, (avgMom / 2) * 0.7 + (avgVol > 1.2 ? 0.3 : 0))
  })
  return scores
}

// ── Market regime detection ─────────────────────
export function detectRegime() {
  const changes = Object.values(stockData).map(d => d.dayChange || 0)
  const avg = changes.reduce((a, b) => a + b, 0) / changes.length
  const pctNeg = changes.filter(c => c < 0).length / changes.length * 100
  const pctUp = changes.filter(c => c > 0).length / changes.length * 100

  let regime, confidence
  if (avg < -0.5 || pctNeg > 65) {
    regime = 'BEARISH'
    confidence = Math.min(1, (Math.abs(avg) / 2 + (pctNeg - 50) / 50) / 2)
  } else if (avg > 0.5 || pctUp > 65) {
    regime = 'BULLISH'
    confidence = Math.min(1, (avg / 2 + (pctUp - 50) / 50) / 2)
  } else {
    regime = 'NEUTRAL'
    confidence = 1 - Math.abs(avg) / 1
  }

  return {
    regime,
    confidence: Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100,
    avgDayChange: Math.round(avg * 100) / 100,
    pctNegative: Math.round(pctNeg * 10) / 10,
    pctPositive: Math.round(pctUp * 10) / 10,
    stockCount: changes.length,
  }
}

// ── Directional hint from regime + stock indicators ──
function getDirectionalHint(stock, regime) {
  // Regime is the primary hint source (proven more reliable than per-stock RSI)
  if (regime && regime.regime !== 'NEUTRAL') {
    return regime.regime === 'BULLISH' ? 'lean bullish' : 'lean bearish'
  }
  // Fall back to stock-level indicators only if regime is neutral
  if (stock.rsi > 60 && stock.ema9Above21) return 'lean bullish'
  if (stock.rsi < 35) return 'lean bearish'
  return 'direction unclear'
}

// ── Score a single stock ────────────────────────
function scoreStock(stock, sectorScores) {
  const signals = {
    volumeAccumulation: calcVolumeAccumulation(stock),
    institutionalFootprint: calcInstitutionalFootprint(stock),
    sectorRotation: calcSectorRotation(stock, sectorScores),
    volatilitySqueeze: calcVolatilitySqueeze(stock),
    momentumDivergence: calcMomentumDivergence(stock),
  }

  const composite = Math.min(1, Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (signals[key] || 0) * weight, 0
  ))

  const strength = composite >= THRESHOLDS.STRONG ? 'STRONG'
    : composite >= THRESHOLDS.MODERATE ? 'MODERATE'
    : composite >= THRESHOLDS.WEAK ? 'WEAK' : null

  return { signals, composite, strength }
}

// ── Main detection (live, current snapshot) ──────
export function detectPreMoves() {
  const sectorScores = computeSectorScores()
  const regime = detectRegime()
  const results = []

  Object.entries(stockData).forEach(([ticker, data]) => {
    const stock = { ...data, ticker }
    const { signals, composite, strength } = scoreStock(stock, sectorScores)

    if (strength) {
      results.push({
        ticker,
        sector: getSector(ticker),
        price: data.close,
        dayChange: data.dayChange,
        composite: Math.round(composite * 1000) / 1000,
        strength,
        mode: 'VOLATILITY',
        hint: getDirectionalHint(stock, regime),
        regime: regime.regime,
        signals,
        rsi: data.rsi,
        adx: data.adx,
        volumeRatio: data.volumeRatio,
        bbPct: data.bbPct,
        atrPct: data.atrPct,
        detectedAt: new Date().toISOString(),
      })
    }
  })

  return results.sort((a, b) => b.composite - a.composite)
}

// ── Historical accuracy from real OHLCV backtest ──
//
// Loaded from premove_backtest_results.json, generated by:
//   node src/scripts/runBacktest.cjs
// Uses 364 stocks x 1045 trading days (2022-01-03 to 2026-03-24)
// with real OHLCV data and computed indicators (RSI, ADX, MACD, BB, VR).

export function getHistoricalAccuracy() {
  const r = backtestResults
  const mkBucket = (b) => ({
    total: b.total, correct: b.correct, accuracy: b.accuracy,
    reliable: b.total >= BACKTEST.MIN_SAMPLE_SIZE,
    ...(b.avgMove !== undefined ? { avgMove: b.avgMove } : {}),
  })

  return {
    totalDetections: r.totalDetections,
    correctMoves: r.correctPredictions,
    accuracy: r.accuracy,
    avgMoveSize: r.avgMove,
    avgTimeToMove: r.avgTimeToMove,
    costPctUsed: 0.39,
    moveThreshold: r.targetMove,
    minSampleSize: BACKTEST.MIN_SAMPLE_SIZE,
    strongAccuracy: r.byStrength.STRONG.accuracy,
    moderateAccuracy: r.byStrength.MODERATE.accuracy,
    weakAccuracy: r.byStrength.WEAK.accuracy,
    byStrength: {
      STRONG: mkBucket(r.byStrength.STRONG),
      MODERATE: mkBucket(r.byStrength.MODERATE),
      WEAK: mkBucket(r.byStrength.WEAK),
    },
    signalQuality: {
      highConviction: { total: r.signalQuality.highConviction.total, correct: r.signalQuality.highConviction.correct, accuracy: r.signalQuality.highConviction.accuracy, reliable: true },
      lowConviction: { total: r.signalQuality.lowConviction.total, correct: r.signalQuality.lowConviction.correct, accuracy: r.signalQuality.lowConviction.accuracy, reliable: true },
      edge: r.signalQuality.edge,
    },
    signalOverlap: r.signalOverlap || null,
    byYear: r.byYear || null,
    bySector: r.bySector || null,
    mode: 'direction-free',
    dataSource: 'historical_ohlcv',
    period: `${r.startDate} to ${r.endDate}`,
    tradingDays: r.tradingDays,
    stocksAnalyzed: r.stockCount,
    lastUpdated: r.generatedAt,
  }
}

export { WEIGHTS, THRESHOLDS, BACKTEST }
