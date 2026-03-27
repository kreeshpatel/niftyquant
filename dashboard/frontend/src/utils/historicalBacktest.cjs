/**
 * Historical Pre-Move Backtest Engine
 *
 * Loads real OHLCV data from C:\project\data\*.csv (365 stocks, 2021-2026),
 * calculates technical indicators, runs the Pre-Move Detection algorithm
 * on each trading day, and tracks forward returns.
 *
 * Designed to be run via Node.js script (not in browser — too much data).
 */

// ── Indicator calculations (pure functions) ──────

function ema(data, period) {
  const k = 2 / (period + 1)
  const result = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k))
  }
  return result
}

function sma(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    result.push(sum / period)
  }
  return result
}

function rsi(closes, period = 14) {
  const result = new Array(closes.length).fill(null)
  let avgGain = 0, avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) avgGain += change; else avgLoss += -change
  }
  avgGain /= period
  avgLoss /= period

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return result
}

function adx(highs, lows, closes, period = 14) {
  const n = highs.length
  const result = new Array(n).fill(null)
  if (n < period * 2) return result

  const trueRanges = [0]
  const plusDMs = [0]
  const minusDMs = [0]

  for (let i = 1; i < n; i++) {
    trueRanges.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])))
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  const smoothTR = ema(trueRanges, period)
  const smoothPlusDM = ema(plusDMs, period)
  const smoothMinusDM = ema(minusDMs, period)

  const dx = []
  for (let i = 0; i < n; i++) {
    if (smoothTR[i] === 0) { dx.push(0); continue }
    const pDI = (smoothPlusDM[i] / smoothTR[i]) * 100
    const mDI = (smoothMinusDM[i] / smoothTR[i]) * 100
    const sum = pDI + mDI
    dx.push(sum > 0 ? Math.abs(pDI - mDI) / sum * 100 : 0)
  }
  const adxSmooth = ema(dx, period)
  for (let i = period * 2; i < n; i++) result[i] = adxSmooth[i]
  return result
}

function macdHistogram(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = emaFast.map((f, i) => f - emaSlow[i])
  const signalLine = ema(macdLine, signal)
  return macdLine.map((m, i) => m - signalLine[i])
}

function bollingerPctB(closes, period = 20, stdDev = 2) {
  const result = new Array(closes.length).fill(null)
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period)
    const upper = mean + stdDev * std
    const lower = mean - stdDev * std
    const range = upper - lower
    result[i] = range > 0 ? (closes[i] - lower) / range : 0.5
  }
  return result
}

function volumeRatio(volumes, period = 20) {
  const result = new Array(volumes.length).fill(null)
  for (let i = period; i < volumes.length; i++) {
    const avg = volumes.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    result[i] = avg > 0 ? volumes[i] / avg : 1
  }
  return result
}

// ── Signal functions (mirror preMove.js exactly) ──

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
  const rsi_ = stock.rsi || 50
  const macdHist = stock.macdHist || 0
  const priceChange = Math.abs(stock.dayChange || 0)
  let score = 0
  if (priceChange < 1) {
    if (rsi_ > 55) score += (rsi_ - 55) / 45 * 0.5
    if (rsi_ < 35) score += (35 - rsi_) / 35 * 0.5
  }
  if (macdHist > 0 && priceChange < 1) score += Math.min(0.5, macdHist / 2)
  return Math.min(1, score)
}

function calcInstitutionalFootprint(stock) {
  const vr = stock.volumeRatio || 1
  const priceChange = Math.abs(stock.dayChange || 0)
  const adx_ = stock.adx || 0
  const posIn52w = stock.posIn52w || 0.5
  let score = 0
  if (vr > 1.5 && priceChange < 1) score += 0.4
  else if (vr > 1.3 && priceChange < 0.5) score += 0.25
  if (adx_ > 25 && vr > 1.3) score += 0.3
  else if (adx_ > 20 && vr > 1.5) score += 0.15
  if (posIn52w > 0.8 && vr > 1.2) score += 0.2
  if (vr > 2.5 && priceChange < 1.5) score += 0.2
  return Math.min(1, score)
}

// ── Optimised weights from grid search ──

const WEIGHTS = {
  volumeAccumulation: 0.35,
  institutionalFootprint: 0.30,
  sectorRotation: 0.20,
  volatilitySqueeze: 0.10,
  momentumDivergence: 0.05,
}

const THRESHOLDS = { STRONG: 0.58, MODERATE: 0.48, WEAK: 0.40 }

// ── Core backtest engine ─────────────────────────

function loadCSV(filepath) {
  const fs = require('fs')
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row = {}
    headers.forEach((h, i) => row[h] = vals[i])
    return row
  })
}

function loadAllStocks(dataDir) {
  const fs = require('fs')
  const path = require('path')
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const stocks = {}

  for (const file of files) {
    const ticker = file.replace('.NS.csv', '')
    const rows = loadCSV(path.join(dataDir, file))
    const parsed = rows.map(r => ({
      date: r.Date,
      open: parseFloat(r.Open),
      high: parseFloat(r.High),
      low: parseFloat(r.Low),
      close: parseFloat(r.Close),
      volume: parseInt(r.Volume) || 0,
    })).filter(r => !isNaN(r.close) && r.close > 0)

    if (parsed.length < 60) continue // need enough history for indicators
    stocks[ticker] = parsed
  }
  return stocks
}

function computeIndicators(bars) {
  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume)

  const rsiVals = rsi(closes, 14)
  const adxVals = adx(highs, lows, closes, 14)
  const macdVals = macdHistogram(closes, 12, 26, 9)
  const bbVals = bollingerPctB(closes, 20, 2)
  const vrVals = volumeRatio(volumes, 20)
  const ema9 = ema(closes, 9)
  const ema21 = ema(closes, 21)

  // 52-week high/low
  const result = []
  for (let i = 0; i < bars.length; i++) {
    const lookback = Math.min(252, i + 1)
    const high52w = Math.max(...closes.slice(Math.max(0, i - lookback + 1), i + 1))
    const low52w = Math.min(...closes.slice(Math.max(0, i - lookback + 1), i + 1))
    const posIn52w = (high52w !== low52w) ? (closes[i] - low52w) / (high52w - low52w) : 0.5

    const dayChange = i > 0 ? ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100 : 0

    result.push({
      ...bars[i],
      dayChange,
      rsi: rsiVals[i],
      adx: adxVals[i],
      macdHist: macdVals[i],
      bbPct: bbVals[i],
      volumeRatio: vrVals[i],
      ema9Above21: (ema9[i] !== null && ema21[i] !== null) ? (ema9[i] > ema21[i] ? 1 : 0) : 0,
      posIn52w,
    })
  }
  return result
}

function scoreStock(stock, sectorScore) {
  const signals = {
    volumeAccumulation: calcVolumeAccumulation(stock),
    institutionalFootprint: calcInstitutionalFootprint(stock),
    sectorRotation: Math.min(1, Math.max(0, sectorScore || 0)),
    volatilitySqueeze: calcVolatilitySqueeze(stock),
    momentumDivergence: calcMomentumDivergence(stock),
  }

  const composite = Math.min(1,
    signals.volumeAccumulation * WEIGHTS.volumeAccumulation +
    signals.institutionalFootprint * WEIGHTS.institutionalFootprint +
    signals.sectorRotation * WEIGHTS.sectorRotation +
    signals.volatilitySqueeze * WEIGHTS.volatilitySqueeze +
    signals.momentumDivergence * WEIGHTS.momentumDivergence
  )

  const strength = composite >= THRESHOLDS.STRONG ? 'STRONG'
    : composite >= THRESHOLDS.MODERATE ? 'MODERATE'
    : composite >= THRESHOLDS.WEAK ? 'WEAK' : null

  return { signals, composite, strength }
}

// ── Main backtest runner ─────────────────────────

async function runFullHistoricalBacktest(config = {}) {
  const {
    targetMove = 3.39,
    maxHoldDays = 5,
    startDate = '2022-01-01',
    endDate = '2026-03-24',
    dataDir = 'C:/project/data',
    sectorMapPath = null,
  } = config

  console.log('Loading stock data...')
  const allStocks = loadAllStocks(dataDir)
  const tickers = Object.keys(allStocks)
  console.log(`Loaded ${tickers.length} stocks`)

  // Load sector map by parsing sectorMap.js as text (it's ESM, can't require)
  let sectorMap = {}
  try {
    const smPath = require('path').resolve(__dirname, '../data/sectorMap.js')
    const smText = require('fs').readFileSync(smPath, 'utf8')
    // Extract SECTOR_MAP object entries via regex
    const matches = smText.matchAll(/'([A-Z&\-]+)':\s*'([^']+)'/g)
    for (const m of matches) sectorMap[m[1]] = m[2]
    console.log(`Loaded sector map: ${Object.keys(sectorMap).length} mappings`)
  } catch (e) {
    console.log('Could not load sector map:', e.message)
  }
  const getSector = (t) => sectorMap[t] || 'Others'

  console.log('Computing indicators for all stocks...')
  const stockIndicators = {}
  for (const ticker of tickers) {
    stockIndicators[ticker] = computeIndicators(allStocks[ticker])
  }

  // Build date index: for each date, which stocks have data at which index
  const dateMap = {} // date -> { ticker: rowIndex }
  for (const ticker of tickers) {
    const rows = stockIndicators[ticker]
    for (let i = 0; i < rows.length; i++) {
      const d = rows[i].date
      if (d < startDate || d > endDate) continue
      if (!dateMap[d]) dateMap[d] = {}
      dateMap[d][ticker] = i
    }
  }

  const tradingDays = Object.keys(dateMap).sort()
  console.log(`Trading days in range: ${tradingDays.length} (${tradingDays[0]} to ${tradingDays[tradingDays.length - 1]})`)

  // Run detection on each day
  console.log('Running Pre-Move detection on each trading day...')
  const allDetections = []
  let processed = 0

  for (const date of tradingDays) {
    const tickerIndices = dateMap[date]

    // Compute sector scores for this day
    const sectorAgg = {}
    for (const [ticker, idx] of Object.entries(tickerIndices)) {
      const row = stockIndicators[ticker][idx]
      if (!row || row.rsi === null) continue
      const sector = getSector(ticker)
      if (!sectorAgg[sector]) sectorAgg[sector] = { totalMom: 0, count: 0, volumeSum: 0 }
      sectorAgg[sector].totalMom += (row.rsi > 50 ? 1 : 0) + (row.ema9Above21 ? 0.5 : 0)
      sectorAgg[sector].volumeSum += (row.volumeRatio || 1)
      sectorAgg[sector].count++
    }
    const sectorScores = {}
    for (const [sector, d] of Object.entries(sectorAgg)) {
      const avgMom = d.totalMom / d.count
      const avgVol = d.volumeSum / d.count
      sectorScores[sector] = Math.min(1, (avgMom / 2) * 0.7 + (avgVol > 1.2 ? 0.3 : 0))
    }

    // Score each stock
    for (const [ticker, idx] of Object.entries(tickerIndices)) {
      const row = stockIndicators[ticker][idx]
      if (!row || row.rsi === null || row.adx === null || row.bbPct === null) continue

      const stock = { ...row, ticker }
      const sectorScore = sectorScores[getSector(ticker)] || 0
      const { signals, composite, strength } = scoreStock(stock, sectorScore)

      if (!strength) continue

      // Track forward returns
      const future = stockIndicators[ticker]
      const fwdReturns = {}
      let maxMove = 0, maxMoveDay = 0, hitTarget = false

      for (let d = 1; d <= maxHoldDays; d++) {
        const fIdx = idx + d
        if (fIdx >= future.length) break
        const fClose = future[fIdx].close
        const movePct = ((fClose - row.close) / row.close) * 100
        fwdReturns[`return${d}d`] = Math.round(movePct * 100) / 100
        if (Math.abs(movePct) > Math.abs(maxMove)) {
          maxMove = movePct
          maxMoveDay = d
        }
        if (!hitTarget && Math.abs(movePct) >= targetMove) {
          hitTarget = true
        }
      }

      allDetections.push({
        ticker,
        sector: getSector(ticker),
        detectionDate: date,
        strength,
        composite: Math.round(composite * 1000) / 1000,
        ...fwdReturns,
        maxMove: Math.round(maxMove * 100) / 100,
        maxMoveDay,
        hitTarget,
        correct: hitTarget,
      })
    }

    processed++
    if (processed % 100 === 0) {
      process.stdout.write(`  Day ${processed}/${tradingDays.length} (${date}) — ${allDetections.length} detections so far\r`)
    }
  }
  console.log(`\nDetection complete: ${allDetections.length} total detections across ${tradingDays.length} days`)

  // ── Aggregate metrics ──

  const correct = allDetections.filter(d => d.correct)
  const pct = (n, total) => total > 0 ? Math.round(n / total * 1000) / 10 : 0

  // By strength
  const byStrength = {}
  for (const tier of ['STRONG', 'MODERATE', 'WEAK']) {
    const bucket = allDetections.filter(d => d.strength === tier)
    const bucketCorrect = bucket.filter(d => d.correct)
    const moves = bucket.map(d => Math.abs(d.maxMove))
    byStrength[tier] = {
      total: bucket.length,
      correct: bucketCorrect.length,
      accuracy: pct(bucketCorrect.length, bucket.length),
      avgMove: moves.length > 0 ? Math.round(moves.reduce((a, b) => a + b, 0) / moves.length * 10) / 10 : 0,
      sampleSize: bucket.length,
      reliable: bucket.length >= 30,
    }
  }

  // By sector
  const bySector = {}
  for (const det of allDetections) {
    if (!bySector[det.sector]) bySector[det.sector] = { total: 0, correct: 0 }
    bySector[det.sector].total++
    if (det.correct) bySector[det.sector].correct++
  }
  for (const s of Object.keys(bySector)) {
    bySector[s].accuracy = pct(bySector[s].correct, bySector[s].total)
  }

  // By year
  const byYear = {}
  for (const det of allDetections) {
    const year = det.detectionDate.slice(0, 4)
    if (!byYear[year]) byYear[year] = { total: 0, correct: 0 }
    byYear[year].total++
    if (det.correct) byYear[year].correct++
  }
  for (const y of Object.keys(byYear)) {
    byYear[y].accuracy = pct(byYear[y].correct, byYear[y].total)
  }

  // Signal quality
  const hiConv = allDetections.filter(d => d.strength === 'STRONG' || d.strength === 'MODERATE')
  const loConv = allDetections.filter(d => d.strength === 'WEAK')
  const hiCorrect = hiConv.filter(d => d.correct)
  const loCorrect = loConv.filter(d => d.correct)
  const hiAcc = pct(hiCorrect.length, hiConv.length)
  const loAcc = pct(loCorrect.length, loConv.length)

  // Avg move and time
  const allMoves = allDetections.map(d => Math.abs(d.maxMove))
  const correctTimes = correct.map(d => d.maxMoveDay).filter(d => d > 0)

  const results = {
    startDate: tradingDays[0],
    endDate: tradingDays[tradingDays.length - 1],
    tradingDays: tradingDays.length,
    totalDetections: allDetections.length,
    correctPredictions: correct.length,
    accuracy: pct(correct.length, allDetections.length),
    avgMove: allMoves.length > 0 ? Math.round(allMoves.reduce((a, b) => a + b, 0) / allMoves.length * 10) / 10 : 0,
    avgTimeToMove: correctTimes.length > 0 ? Math.round(correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length * 10) / 10 : 0,
    targetMove,
    maxHoldDays,
    weights: WEIGHTS,
    thresholds: THRESHOLDS,
    byStrength,
    bySector,
    byYear,
    signalQuality: {
      highConviction: { total: hiConv.length, correct: hiCorrect.length, accuracy: hiAcc },
      lowConviction: { total: loConv.length, correct: loCorrect.length, accuracy: loAcc },
      edge: Math.round((hiAcc - loAcc) * 10) / 10,
    },
    mode: 'direction-free',
    dataSource: 'historical_ohlcv',
    stockCount: tickers.length,
    generatedAt: new Date().toISOString(),
    // Don't include all detections in main result (too large for JSON import)
    // Save separately if needed
  }

  return { results, detections: allDetections }
}

// ── Signal overlap analysis ──────────────────────

function analyzeSignalOverlap(detections, tradeLogPath) {
  let tradeRows
  try {
    const fs = require('fs')
    const lines = fs.readFileSync(tradeLogPath, 'utf8').trim().split('\n')
    const headers = lines[0].split(',')
    tradeRows = lines.slice(1).map(line => {
      const vals = line.split(',')
      const row = {}
      headers.forEach((h, i) => row[h] = vals[i])
      return row
    })
  } catch (e) {
    console.log('Could not load trade_log:', e.message)
    return null
  }

  // Build detection lookup: date+ticker -> detection
  const detLookup = new Set()
  // Also check +-1 day window for matching
  for (const det of detections) {
    for (let offset = -2; offset <= 0; offset++) {
      const d = new Date(det.detectionDate)
      d.setDate(d.getDate() + offset)
      const key = d.toISOString().slice(0, 10) + ':' + det.ticker
      detLookup.add(key)
    }
  }

  let withSignal = { count: 0, wins: 0, totalReturn: 0 }
  let withoutSignal = { count: 0, wins: 0, totalReturn: 0 }

  for (const trade of tradeRows) {
    const key = (trade.entry_date || '') + ':' + (trade.ticker || '')
    const ret = parseFloat(trade.return_pct) || 0
    const isWin = ret > 0

    if (detLookup.has(key)) {
      withSignal.count++
      if (isWin) withSignal.wins++
      withSignal.totalReturn += ret
    } else {
      withoutSignal.count++
      if (isWin) withoutSignal.wins++
      withoutSignal.totalReturn += ret
    }
  }

  const wrWith = withSignal.count > 0 ? withSignal.wins / withSignal.count * 100 : 0
  const wrWithout = withoutSignal.count > 0 ? withoutSignal.wins / withoutSignal.count * 100 : 0

  return {
    tradesWithSignal: {
      count: withSignal.count,
      winRate: Math.round(wrWith * 10) / 10,
      avgReturn: withSignal.count > 0 ? Math.round(withSignal.totalReturn / withSignal.count * 100) / 100 : 0,
    },
    tradesWithoutSignal: {
      count: withoutSignal.count,
      winRate: Math.round(wrWithout * 10) / 10,
      avgReturn: withoutSignal.count > 0 ? Math.round(withoutSignal.totalReturn / withoutSignal.count * 100) / 100 : 0,
    },
    signalLift: Math.round((wrWith - wrWithout) * 10) / 10,
    totalTrades: tradeRows.length,
  }
}

module.exports = { runFullHistoricalBacktest, analyzeSignalOverlap }
