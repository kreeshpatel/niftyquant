/**
 * Pre-Move Portfolio Simulation
 *
 * Run: node src/scripts/runPortfolioSim.cjs
 * From: C:\project\dashboard\frontend
 *
 * Simulates a portfolio that buys STRONG/MODERATE Pre-Move signals
 * from 2025-01-01 to 2026-03-27 with real OHLCV data.
 */

const fs = require('fs')
const path = require('path')

// ── Config ───────────────────────────────────────
const CONFIG = {
  startDate: '2025-01-01',
  endDate: '2026-03-27',
  startingCapital: 1000000,
  riskPerTrade: 0.015,      // 1.5%
  maxPositionPct: 0.10,      // 10% max per position
  maxPositions: 10,
  targetPct: 5.0,
  stopPct: 3.0,
  maxHoldDays: 5,
  minStrength: 'MODERATE',   // STRONG or MODERATE
  slippagePct: 0.1,          // 0.1% per entry/exit
}

const DATA_DIR = path.resolve(__dirname, '../../../../data')
const RESULTS_DIR = path.resolve(__dirname, '../../../../results')
const UI_DIR = path.resolve(__dirname, '../data')

// ── Indicator calculations (same as historicalBacktest.cjs) ──

function ema(data, period) {
  const k = 2 / (period + 1)
  const r = [data[0]]
  for (let i = 1; i < data.length; i++) r.push(data[i] * k + r[i - 1] * (1 - k))
  return r
}

function rsi(closes, period = 14) {
  const r = new Array(closes.length).fill(null)
  let ag = 0, al = 0
  for (let i = 1; i <= period; i++) { const c = closes[i] - closes[i - 1]; if (c > 0) ag += c; else al += -c }
  ag /= period; al /= period
  r[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  for (let i = period + 1; i < closes.length; i++) {
    const c = closes[i] - closes[i - 1]; const g = c > 0 ? c : 0; const l = c < 0 ? -c : 0
    ag = (ag * (period - 1) + g) / period; al = (al * (period - 1) + l) / period
    r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  }
  return r
}

function adx(highs, lows, closes, period = 14) {
  const n = highs.length, r = new Array(n).fill(null)
  if (n < period * 2) return r
  const trs = [0], pDMs = [0], mDMs = [0]
  for (let i = 1; i < n; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])))
    const up = highs[i] - highs[i - 1], dn = lows[i - 1] - lows[i]
    pDMs.push(up > dn && up > 0 ? up : 0); mDMs.push(dn > up && dn > 0 ? dn : 0)
  }
  const sTR = ema(trs, period), sPDM = ema(pDMs, period), sMDM = ema(mDMs, period)
  const dx = []
  for (let i = 0; i < n; i++) {
    if (sTR[i] === 0) { dx.push(0); continue }
    const pDI = (sPDM[i] / sTR[i]) * 100, mDI = (sMDM[i] / sTR[i]) * 100, sum = pDI + mDI
    dx.push(sum > 0 ? Math.abs(pDI - mDI) / sum * 100 : 0)
  }
  const adxS = ema(dx, period)
  for (let i = period * 2; i < n; i++) r[i] = adxS[i]
  return r
}

function macdHist(closes) {
  const f = ema(closes, 12), s = ema(closes, 26), ml = f.map((v, i) => v - s[i]), sl = ema(ml, 9)
  return ml.map((m, i) => m - sl[i])
}

function bbPctB(closes, period = 20) {
  const r = new Array(closes.length).fill(null)
  for (let i = period - 1; i < closes.length; i++) {
    const sl = closes.slice(i - period + 1, i + 1), mn = sl.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(sl.reduce((s, v) => s + (v - mn) ** 2, 0) / period)
    const up = mn + 2 * std, lo = mn - 2 * std, rng = up - lo
    r[i] = rng > 0 ? (closes[i] - lo) / rng : 0.5
  }
  return r
}

function volumeRatio(volumes, period = 20) {
  const r = new Array(volumes.length).fill(null)
  for (let i = period; i < volumes.length; i++) {
    const avg = volumes.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    r[i] = avg > 0 ? volumes[i] / avg : 1
  }
  return r
}

// ── Signal functions (mirror preMove.js) ─────────

function calcVA(s) { const vr = s.volumeRatio || 1; if (vr < 1.2) return 0; const pc = Math.abs(s.dayChange || 0); if (pc > 2) return Math.min(1, Math.max(0, (vr - 1) * 0.3)); return Math.min(1, (vr - 1) / 2) }
function calcVS(s) { const b = s.bbPct; if (b === undefined || b === null) return 0; if (b > 0.6) return 0; if (b < 0.1) return 1; return Math.min(1, 1 - (b / 0.6)) }
function calcMD(s) { const r = s.rsi || 50, mh = s.macdHist || 0, pc = Math.abs(s.dayChange || 0); let sc = 0; if (pc < 1) { if (r > 55) sc += (r - 55) / 45 * 0.5; if (r < 35) sc += (35 - r) / 35 * 0.5 } if (mh > 0 && pc < 1) sc += Math.min(0.5, mh / 2); return Math.min(1, sc) }
function calcIF(s) { const vr = s.volumeRatio || 1, pc = Math.abs(s.dayChange || 0), a = s.adx || 0, p = s.posIn52w || 0.5; let sc = 0; if (vr > 1.5 && pc < 1) sc += 0.4; else if (vr > 1.3 && pc < 0.5) sc += 0.25; if (a > 25 && vr > 1.3) sc += 0.3; else if (a > 20 && vr > 1.5) sc += 0.15; if (p > 0.8 && vr > 1.2) sc += 0.2; if (vr > 2.5 && pc < 1.5) sc += 0.2; return Math.min(1, sc) }

const W = { va: 0.35, if_: 0.30, sr: 0.20, vs: 0.10, md: 0.05 }
const TH = { STRONG: 0.58, MODERATE: 0.48, WEAK: 0.40 }

function scoreStock(stock, sectorScore) {
  const va = calcVA(stock), if_ = calcIF(stock), sr = Math.min(1, Math.max(0, sectorScore || 0))
  const vs = calcVS(stock), md = calcMD(stock)
  const comp = Math.min(1, va * W.va + if_ * W.if_ + sr * W.sr + vs * W.vs + md * W.md)
  const str = comp >= TH.STRONG ? 'STRONG' : comp >= TH.MODERATE ? 'MODERATE' : comp >= TH.WEAK ? 'WEAK' : null
  return { composite: comp, strength: str, signals: { va, if_, sr, vs, md } }
}

// ── Data loading ─────────────────────────────────

function loadCSV(filepath) {
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n')
  const h = lines[0].split(',')
  return lines.slice(1).map(l => { const v = l.split(','); const r = {}; h.forEach((k, i) => r[k] = v[i]); return r })
}

function loadAllStocks() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv') && f !== 'NSEI.csv')
  const stocks = {}
  for (const file of files) {
    const ticker = file.replace('.NS.csv', '')
    const rows = loadCSV(path.join(DATA_DIR, file))
    const parsed = rows.map(r => ({
      date: r.Date, open: parseFloat(r.Open), high: parseFloat(r.High),
      low: parseFloat(r.Low), close: parseFloat(r.Close), volume: parseInt(r.Volume) || 0,
    })).filter(r => !isNaN(r.close) && r.close > 0)
    if (parsed.length >= 60) stocks[ticker] = parsed
  }
  return stocks
}

function computeIndicators(bars) {
  const cl = bars.map(b => b.close), hi = bars.map(b => b.high), lo = bars.map(b => b.low), vo = bars.map(b => b.volume)
  const rsiV = rsi(cl, 14), adxV = adx(hi, lo, cl, 14), macdV = macdHist(cl), bbV = bbPctB(cl, 20), vrV = volumeRatio(vo, 20)
  const e9 = ema(cl, 9), e21 = ema(cl, 21)
  const result = []
  for (let i = 0; i < bars.length; i++) {
    const lb = Math.min(252, i + 1), h52 = Math.max(...cl.slice(Math.max(0, i - lb + 1), i + 1)), l52 = Math.min(...cl.slice(Math.max(0, i - lb + 1), i + 1))
    const dc = i > 0 ? ((cl[i] - cl[i - 1]) / cl[i - 1]) * 100 : 0
    result.push({ ...bars[i], dayChange: dc, rsi: rsiV[i], adx: adxV[i], macdHist: macdV[i], bbPct: bbV[i],
      volumeRatio: vrV[i], ema9Above21: e9[i] > e21[i] ? 1 : 0, posIn52w: (h52 !== l52) ? (cl[i] - l52) / (h52 - l52) : 0.5 })
  }
  return result
}

// ── Sector map ───────────────────────────────────

function loadSectorMap() {
  const sm = {}
  try {
    const text = fs.readFileSync(path.resolve(__dirname, '../data/sectorMap.js'), 'utf8')
    for (const m of text.matchAll(/'([A-Z&\-]+)':\s*'([^']+)'/g)) sm[m[1]] = m[2]
  } catch {}
  return sm
}

// ── Main simulation ──────────────────────────────

function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  Pre-Move Portfolio Simulation')
  console.log(`  Period: ${CONFIG.startDate} to ${CONFIG.endDate}`)
  console.log(`  Capital: \u20B9${(CONFIG.startingCapital / 100000).toFixed(1)}L`)
  console.log(`  Rules: STRONG+MODERATE, +${CONFIG.targetPct}% target, -${CONFIG.stopPct}% stop, ${CONFIG.maxHoldDays}d max`)
  console.log('='.repeat(60))

  console.log('\nLoading data...')
  const allStocks = loadAllStocks()
  const tickers = Object.keys(allStocks)
  console.log(`Loaded ${tickers.length} stocks`)

  const sectorMap = loadSectorMap()
  const getSector = t => sectorMap[t] || 'Others'

  console.log('Computing indicators...')
  const indicators = {}
  for (const t of tickers) indicators[t] = computeIndicators(allStocks[t])

  // Build date index
  const dateIdx = {}
  for (const t of tickers) {
    for (let i = 0; i < indicators[t].length; i++) {
      const d = indicators[t][i].date
      if (d >= CONFIG.startDate && d <= CONFIG.endDate) {
        if (!dateIdx[d]) dateIdx[d] = {}
        dateIdx[d][t] = i
      }
    }
  }
  const tradingDays = Object.keys(dateIdx).sort()
  console.log(`Trading days: ${tradingDays.length} (${tradingDays[0]} to ${tradingDays[tradingDays.length - 1]})`)

  // ── Simulation state ──
  let cash = CONFIG.startingCapital
  const positions = []   // { ticker, entryDate, entryPrice, shares, strength, composite, dayCount }
  const closedTrades = []
  const equityCurve = []
  let peakValue = CONFIG.startingCapital
  let maxDrawdown = 0

  console.log('\nRunning simulation...')

  for (const date of tradingDays) {
    const tickerIdx = dateIdx[date]

    // ── 1. Update open positions, check exits ──
    const toClose = []
    for (let p = positions.length - 1; p >= 0; p--) {
      const pos = positions[p]
      const idx = tickerIdx[pos.ticker]
      if (idx === undefined) { pos.dayCount++; continue }

      const row = indicators[pos.ticker][idx]
      const currentPrice = row.close
      const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
      pos.dayCount++
      pos.currentPrice = currentPrice

      let exitReason = null
      let exitPrice = currentPrice

      // Check intraday target/stop using high/low
      const highPct = ((row.high - pos.entryPrice) / pos.entryPrice) * 100
      const lowPct = ((row.low - pos.entryPrice) / pos.entryPrice) * 100

      if (highPct >= CONFIG.targetPct) {
        exitReason = 'target_hit'
        exitPrice = pos.entryPrice * (1 + CONFIG.targetPct / 100)
      } else if (lowPct <= -CONFIG.stopPct) {
        exitReason = 'stop_loss'
        exitPrice = pos.entryPrice * (1 - CONFIG.stopPct / 100)
      } else if (pos.dayCount >= CONFIG.maxHoldDays) {
        exitReason = 'time_stop'
        exitPrice = currentPrice
      }

      if (exitReason) {
        // Apply slippage on exit
        exitPrice *= (1 - CONFIG.slippagePct / 100)
        const pnl = (exitPrice - pos.entryPrice) * pos.shares
        const pnlP = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100
        cash += exitPrice * pos.shares

        closedTrades.push({
          ticker: pos.ticker, sector: getSector(pos.ticker),
          entryDate: pos.entryDate, entryPrice: Math.round(pos.entryPrice * 100) / 100,
          exitDate: date, exitPrice: Math.round(exitPrice * 100) / 100,
          shares: pos.shares, pnl: Math.round(pnl), pnlPct: Math.round(pnlP * 100) / 100,
          holdDays: pos.dayCount, exitReason,
          strength: pos.strength, composite: pos.composite,
        })

        if (closedTrades.length <= 10 || exitReason === 'target_hit') {
          console.log(`  ${date}: Sold ${pos.ticker} @ ${exitPrice.toFixed(1)} (${pnlP >= 0 ? '+' : ''}${pnlP.toFixed(1)}%, ${exitReason})`)
        }

        toClose.push(p)
      }
    }
    // Remove closed positions (reverse order to preserve indices)
    toClose.sort((a, b) => b - a).forEach(i => positions.splice(i, 1))

    // ── 2. Compute sector scores for today ──
    const sectorAgg = {}
    for (const [t, idx] of Object.entries(tickerIdx)) {
      const row = indicators[t][idx]
      if (!row || row.rsi === null) continue
      const sec = getSector(t)
      if (!sectorAgg[sec]) sectorAgg[sec] = { m: 0, c: 0, v: 0 }
      sectorAgg[sec].m += (row.rsi > 50 ? 1 : 0) + (row.ema9Above21 ? 0.5 : 0)
      sectorAgg[sec].v += (row.volumeRatio || 1)
      sectorAgg[sec].c++
    }
    const sectorScores = {}
    for (const [s, d] of Object.entries(sectorAgg)) {
      sectorScores[s] = Math.min(1, (d.m / d.c / 2) * 0.7 + (d.v / d.c > 1.2 ? 0.3 : 0))
    }

    // ── 3. Scan for new entries ──
    if (positions.length < CONFIG.maxPositions) {
      const candidates = []
      for (const [t, idx] of Object.entries(tickerIdx)) {
        if (positions.some(p => p.ticker === t)) continue // already holding
        const row = indicators[t][idx]
        if (!row || row.rsi === null || row.adx === null || row.bbPct === null) continue
        const { composite, strength } = scoreStock(row, sectorScores[getSector(t)] || 0)
        if (strength === 'STRONG' || (CONFIG.minStrength === 'MODERATE' && strength === 'MODERATE')) {
          candidates.push({ ticker: t, ...row, composite, strength, sectorScore: sectorScores[getSector(t)] || 0 })
        }
      }
      // Sort by composite, take top candidates
      candidates.sort((a, b) => b.composite - a.composite)

      for (const c of candidates) {
        if (positions.length >= CONFIG.maxPositions) break

        // Position sizing: risk 1.5% of portfolio, max 10% per position
        const portfolioValue = cash + positions.reduce((s, p) => s + (p.currentPrice || p.entryPrice) * p.shares, 0)
        const maxPos = portfolioValue * CONFIG.maxPositionPct
        const riskAmount = portfolioValue * CONFIG.riskPerTrade
        const stopDistance = c.close * CONFIG.stopPct / 100
        const sharesByRisk = Math.floor(riskAmount / stopDistance)
        const sharesByMax = Math.floor(maxPos / c.close)
        const shares = Math.max(1, Math.min(sharesByRisk, sharesByMax))
        const cost = c.close * shares * (1 + CONFIG.slippagePct / 100) // slippage on entry

        if (cost > cash) continue // not enough cash

        cash -= cost
        const entryPrice = c.close * (1 + CONFIG.slippagePct / 100)
        positions.push({
          ticker: c.ticker, entryDate: date, entryPrice,
          shares, strength: c.strength, composite: c.composite,
          dayCount: 0, currentPrice: c.close,
        })

        if (closedTrades.length + positions.length <= 20) {
          console.log(`  ${date}: Bought ${c.ticker} @ ${entryPrice.toFixed(1)} x${shares} (${c.strength}, ${(c.composite * 100).toFixed(0)}%)`)
        }
      }
    }

    // ── 4. Record equity curve ──
    const invested = positions.reduce((s, p) => {
      const idx2 = tickerIdx[p.ticker]
      const price = idx2 !== undefined ? indicators[p.ticker][idx2].close : (p.currentPrice || p.entryPrice)
      return s + price * p.shares
    }, 0)
    const totalValue = cash + invested

    if (totalValue > peakValue) peakValue = totalValue
    const dd = peakValue > 0 ? ((peakValue - totalValue) / peakValue) * 100 : 0
    if (dd > maxDrawdown) maxDrawdown = dd

    equityCurve.push({
      date, value: Math.round(totalValue),
      cash: Math.round(cash), invested: Math.round(invested),
      positions: positions.length, drawdown: Math.round(dd * 100) / 100,
    })
  }

  // Close remaining positions at last price
  for (const pos of positions) {
    const lastDay = tradingDays[tradingDays.length - 1]
    const idx = dateIdx[lastDay]?.[pos.ticker]
    const exitPrice = idx !== undefined ? indicators[pos.ticker][idx].close * (1 - CONFIG.slippagePct / 100) : pos.currentPrice
    const pnl = (exitPrice - pos.entryPrice) * pos.shares
    const pnlP = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100
    cash += exitPrice * pos.shares
    closedTrades.push({
      ticker: pos.ticker, sector: getSector(pos.ticker),
      entryDate: pos.entryDate, entryPrice: Math.round(pos.entryPrice * 100) / 100,
      exitDate: lastDay, exitPrice: Math.round(exitPrice * 100) / 100,
      shares: pos.shares, pnl: Math.round(pnl), pnlPct: Math.round(pnlP * 100) / 100,
      holdDays: pos.dayCount, exitReason: 'end_of_sim',
      strength: pos.strength, composite: pos.composite,
    })
  }

  // ── Compute metrics ────────────────────────────
  const endingValue = equityCurve[equityCurve.length - 1]?.value || CONFIG.startingCapital
  const totalReturnPct = ((endingValue - CONFIG.startingCapital) / CONFIG.startingCapital) * 100

  const winners = closedTrades.filter(t => t.pnl > 0)
  const losers = closedTrades.filter(t => t.pnl <= 0)
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
  const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + t.pnlPct, 0) / winners.length : 0
  const avgLoss = losers.length > 0 ? losers.reduce((s, t) => s + t.pnlPct, 0) / losers.length : 0
  const grossWin = winners.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const avgHold = closedTrades.length > 0 ? closedTrades.reduce((s, t) => s + t.holdDays, 0) / closedTrades.length : 0

  // Sharpe from daily returns
  const dailyReturns = []
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].value
    if (prev > 0) dailyReturns.push((equityCurve[i].value - prev) / prev)
  }
  const meanRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0
  const stdRet = dailyReturns.length > 0 ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / dailyReturns.length) : 0
  const sharpe = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0

  // By exit reason
  const byExit = {}
  closedTrades.forEach(t => { byExit[t.exitReason] = (byExit[t.exitReason] || 0) + 1 })

  // By strength
  const byStrength = {}
  for (const str of ['STRONG', 'MODERATE']) {
    const bucket = closedTrades.filter(t => t.strength === str)
    const w = bucket.filter(t => t.pnl > 0)
    byStrength[str] = {
      count: bucket.length,
      winRate: bucket.length > 0 ? Math.round(w.length / bucket.length * 1000) / 10 : 0,
      avgReturn: bucket.length > 0 ? Math.round(bucket.reduce((s, t) => s + t.pnlPct, 0) / bucket.length * 100) / 100 : 0,
      totalPnl: bucket.reduce((s, t) => s + t.pnl, 0),
    }
  }

  const results = {
    config: CONFIG,
    startingCapital: CONFIG.startingCapital,
    endingValue, totalReturn: endingValue - CONFIG.startingCapital,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpe * 100) / 100,
    totalTrades: closedTrades.length,
    winners: winners.length, losers: losers.length,
    winRate: Math.round(winRate * 10) / 10,
    avgWin: Math.round(avgWin * 100) / 100, avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgHoldDays: Math.round(avgHold * 10) / 10,
    byExit, byStrength,
    equityCurve, trades: closedTrades,
    generatedAt: new Date().toISOString(),
  }

  // ── Output ─────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('\n' + '='.repeat(60))
  console.log('  RESULTS')
  console.log('='.repeat(60))
  console.log(`  Period:         ${tradingDays[0]} to ${tradingDays[tradingDays.length - 1]}`)
  console.log(`  Starting:       \u20B9${(CONFIG.startingCapital / 100000).toFixed(2)}L`)
  console.log(`  Ending:         \u20B9${(endingValue / 100000).toFixed(2)}L`)
  console.log(`  Total return:   ${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`)
  console.log(`  Max drawdown:   -${maxDrawdown.toFixed(2)}%`)
  console.log(`  Sharpe ratio:   ${sharpe.toFixed(2)}`)
  console.log(`  Trades:         ${closedTrades.length}`)
  console.log(`  Win rate:       ${winRate.toFixed(1)}%`)
  console.log(`  Profit factor:  ${profitFactor.toFixed(2)}`)
  console.log(`  Avg hold:       ${avgHold.toFixed(1)} days`)
  console.log(`  Avg win:        +${avgWin.toFixed(2)}%`)
  console.log(`  Avg loss:       ${avgLoss.toFixed(2)}%`)
  console.log('')
  console.log('  Exit reasons:')
  Object.entries(byExit).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => {
    console.log(`    ${r.padEnd(14)} ${c} (${(c / closedTrades.length * 100).toFixed(0)}%)`)
  })
  console.log('')
  console.log('  By strength:')
  Object.entries(byStrength).forEach(([s, d]) => {
    console.log(`    ${s.padEnd(12)} ${d.count} trades, ${d.winRate}% win rate, avg ${d.avgReturn >= 0 ? '+' : ''}${d.avgReturn}%`)
  })
  console.log('')
  console.log(`  Completed in ${elapsed}s`)

  // Save
  fs.writeFileSync(path.join(RESULTS_DIR, 'portfolio_sim_2025.json'), JSON.stringify(results, null, 2))
  console.log(`  Saved: results/portfolio_sim_2025.json`)

  // Trade CSV
  const csvHeader = 'ticker,sector,entryDate,entryPrice,exitDate,exitPrice,shares,pnl,pnlPct,holdDays,exitReason,strength,composite'
  const csvRows = closedTrades.map(t => [t.ticker, t.sector, t.entryDate, t.entryPrice, t.exitDate, t.exitPrice, t.shares, t.pnl, t.pnlPct, t.holdDays, t.exitReason, t.strength, t.composite].join(','))
  fs.writeFileSync(path.join(RESULTS_DIR, 'portfolio_sim_trades.csv'), csvHeader + '\n' + csvRows.join('\n'))
  console.log(`  Saved: results/portfolio_sim_trades.csv`)

  // Equity CSV
  const eqHeader = 'date,value,cash,invested,positions,drawdown'
  const eqRows = equityCurve.map(e => [e.date, e.value, e.cash, e.invested, e.positions, e.drawdown].join(','))
  fs.writeFileSync(path.join(RESULTS_DIR, 'portfolio_sim_equity.csv'), eqHeader + '\n' + eqRows.join('\n'))
  console.log(`  Saved: results/portfolio_sim_equity.csv`)

  // UI JSON (compact — no individual trades, just summary + equity)
  const uiResults = { ...results, trades: results.trades.slice(0, 50) } // cap trades for bundle size
  fs.writeFileSync(path.join(UI_DIR, 'portfolioSimResults.json'), JSON.stringify(uiResults, null, 2))
  console.log(`  Saved: src/data/portfolioSimResults.json`)
}

main()
