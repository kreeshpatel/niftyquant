/**
 * Pre-Move Portfolio Simulation — Alternative Strategies
 *
 * Run: node src/scripts/runSimAlternatives.cjs
 * From: C:\project\dashboard\frontend
 *
 * Tests 5 strategy variants against the baseline to find what works.
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '../../../../data')
const RESULTS_DIR = path.resolve(__dirname, '../../../../results')
const UI_DIR = path.resolve(__dirname, '../data')

// ── Indicators (same as runPortfolioSim.cjs) ─────

function ema(d, p) { const k = 2 / (p + 1), r = [d[0]]; for (let i = 1; i < d.length; i++) r.push(d[i] * k + r[i - 1] * (1 - k)); return r }
function rsi(c, p = 14) { const r = new Array(c.length).fill(null); let ag = 0, al = 0; for (let i = 1; i <= p; i++) { const ch = c[i] - c[i - 1]; if (ch > 0) ag += ch; else al += -ch } ag /= p; al /= p; r[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); for (let i = p + 1; i < c.length; i++) { const ch = c[i] - c[i - 1]; ag = (ag * (p - 1) + (ch > 0 ? ch : 0)) / p; al = (al * (p - 1) + (ch < 0 ? -ch : 0)) / p; r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al) } return r }
function adx(hi, lo, cl, p = 14) { const n = hi.length, r = new Array(n).fill(null); if (n < p * 2) return r; const trs = [0], pD = [0], mD = [0]; for (let i = 1; i < n; i++) { trs.push(Math.max(hi[i] - lo[i], Math.abs(hi[i] - cl[i - 1]), Math.abs(lo[i] - cl[i - 1]))); const u = hi[i] - hi[i - 1], d = lo[i - 1] - lo[i]; pD.push(u > d && u > 0 ? u : 0); mD.push(d > u && d > 0 ? d : 0) } const sT = ema(trs, p), sP = ema(pD, p), sM = ema(mD, p); const dx = []; for (let i = 0; i < n; i++) { if (sT[i] === 0) { dx.push(0); continue } const pi = (sP[i] / sT[i]) * 100, mi = (sM[i] / sT[i]) * 100, s = pi + mi; dx.push(s > 0 ? Math.abs(pi - mi) / s * 100 : 0) } const a = ema(dx, p); for (let i = p * 2; i < n; i++) r[i] = a[i]; return r }
function macdH(c) { const f = ema(c, 12), s = ema(c, 26), m = f.map((v, i) => v - s[i]), sl = ema(m, 9); return m.map((v, i) => v - sl[i]) }
function bbPct(c, p = 20) { const r = new Array(c.length).fill(null); for (let i = p - 1; i < c.length; i++) { const s = c.slice(i - p + 1, i + 1), mn = s.reduce((a, b) => a + b, 0) / p, st = Math.sqrt(s.reduce((a, v) => a + (v - mn) ** 2, 0) / p), rng = 4 * st; r[i] = rng > 0 ? (c[i] - (mn - 2 * st)) / rng : 0.5 } return r }
function volRatio(v, p = 20) { const r = new Array(v.length).fill(null); for (let i = p; i < v.length; i++) { const a = v.slice(i - p, i).reduce((s, x) => s + x, 0) / p; r[i] = a > 0 ? v[i] / a : 1 } return r }

// ── Signal scoring ───────────────────────────────

function calcVA(s) { const vr = s.volumeRatio || 1; if (vr < 1.2) return 0; const pc = Math.abs(s.dayChange || 0); if (pc > 2) return Math.min(1, Math.max(0, (vr - 1) * 0.3)); return Math.min(1, (vr - 1) / 2) }
function calcIF(s) { const vr = s.volumeRatio || 1, pc = Math.abs(s.dayChange || 0), a = s.adx || 0, p = s.posIn52w || 0.5; let sc = 0; if (vr > 1.5 && pc < 1) sc += 0.4; else if (vr > 1.3 && pc < 0.5) sc += 0.25; if (a > 25 && vr > 1.3) sc += 0.3; else if (a > 20 && vr > 1.5) sc += 0.15; if (p > 0.8 && vr > 1.2) sc += 0.2; if (vr > 2.5 && pc < 1.5) sc += 0.2; return Math.min(1, sc) }
function calcVS(s) { const b = s.bbPct; if (b === undefined || b === null) return 0; if (b > 0.6) return 0; if (b < 0.1) return 1; return Math.min(1, 1 - (b / 0.6)) }
function calcMD(s) { const r = s.rsi || 50, mh = s.macdHist || 0, pc = Math.abs(s.dayChange || 0); let sc = 0; if (pc < 1) { if (r > 55) sc += (r - 55) / 45 * 0.5; if (r < 35) sc += (35 - r) / 35 * 0.5 } if (mh > 0 && pc < 1) sc += Math.min(0.5, mh / 2); return Math.min(1, sc) }

function scoreStock(stock, secScore) {
  const comp = Math.min(1, calcVA(stock) * 0.35 + calcIF(stock) * 0.30 + (secScore || 0) * 0.20 + calcVS(stock) * 0.10 + calcMD(stock) * 0.05)
  return { composite: comp, strength: comp >= 0.58 ? 'STRONG' : comp >= 0.48 ? 'MODERATE' : comp >= 0.40 ? 'WEAK' : null }
}

// ── Data loading ─────────────────────────────────

function loadAll() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv') && f !== 'NSEI.csv')
  const stocks = {}
  for (const file of files) {
    const t = file.replace('.NS.csv', '')
    const lines = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').trim().split('\n')
    const h = lines[0].split(',')
    const rows = lines.slice(1).map(l => { const v = l.split(','); return { date: v[0], open: parseFloat(v[1]), high: parseFloat(v[2]), low: parseFloat(v[3]), close: parseFloat(v[4]), volume: parseInt(v[5]) || 0 } }).filter(r => !isNaN(r.close) && r.close > 0)
    if (rows.length >= 60) stocks[t] = rows
  }
  return stocks
}

function computeInd(bars) {
  const cl = bars.map(b => b.close), hi = bars.map(b => b.high), lo = bars.map(b => b.low), vo = bars.map(b => b.volume)
  const rv = rsi(cl), av = adx(hi, lo, cl), mv = macdH(cl), bv = bbPct(cl), vv = volRatio(vo), e9 = ema(cl, 9), e21 = ema(cl, 21)
  return bars.map((b, i) => {
    const lb = Math.min(252, i + 1), h52 = Math.max(...cl.slice(Math.max(0, i - lb + 1), i + 1)), l52 = Math.min(...cl.slice(Math.max(0, i - lb + 1), i + 1))
    return { ...b, dayChange: i > 0 ? ((cl[i] - cl[i - 1]) / cl[i - 1]) * 100 : 0, rsi: rv[i], adx: av[i], macdHist: mv[i], bbPct: bv[i], volumeRatio: vv[i], ema9Above21: e9[i] > e21[i] ? 1 : 0, posIn52w: h52 !== l52 ? (cl[i] - l52) / (h52 - l52) : 0.5 }
  })
}

// ── Sector map ───────────────────────────────────

function loadSectors() {
  const sm = {}
  try { for (const m of fs.readFileSync(path.resolve(__dirname, '../data/sectorMap.js'), 'utf8').matchAll(/'([A-Z&\-]+)':\s*'([^']+)'/g)) sm[m[1]] = m[2] } catch {}
  return sm
}

// ── Simulation engine ────────────────────────────

function runSim(config, indicators, dateIdx, tradingDays, getSector) {
  let cash = config.startingCapital
  const positions = [], closed = []
  const equity = []
  let peak = config.startingCapital, maxDD = 0

  for (const date of tradingDays) {
    const tidx = dateIdx[date]

    // ── Check regime if needed ──
    let regimeBullish = true
    if (config.regimeFilter) {
      const changes = []
      for (const [t, idx] of Object.entries(tidx)) {
        const row = indicators[t][idx]
        if (row?.dayChange !== undefined) changes.push(row.dayChange)
      }
      if (changes.length > 0) {
        const avg = changes.reduce((a, b) => a + b, 0) / changes.length
        const pctUp = changes.filter(c => c > 0).length / changes.length * 100
        regimeBullish = avg > 0.5 || pctUp > 65
      }
    }

    // ── Update positions, check exits ──
    for (let p = positions.length - 1; p >= 0; p--) {
      const pos = positions[p]
      const idx = tidx[pos.ticker]
      if (idx === undefined) { pos.dayCount++; continue }
      const row = indicators[pos.ticker][idx]
      pos.dayCount++
      pos.currentPrice = row.close

      const highPct = ((row.high - pos.entryPrice) / pos.entryPrice) * 100
      const lowPct = ((row.low - pos.entryPrice) / pos.entryPrice) * 100
      const closePct = ((row.close - pos.entryPrice) / pos.entryPrice) * 100

      // Trailing stop logic
      if (config.trailingStop) {
        if (highPct >= config.trailActivate) pos.trailActive = true
        if (pos.trailActive) {
          const trailPrice = row.high * (1 - config.trailPct / 100)
          if (!pos.trailStop || trailPrice > pos.trailStop) pos.trailStop = trailPrice
        }
      }

      let exitReason = null, exitPrice = row.close
      if (highPct >= config.targetPct) { exitReason = 'target_hit'; exitPrice = pos.entryPrice * (1 + config.targetPct / 100) }
      else if (lowPct <= -config.stopPct) { exitReason = 'stop_loss'; exitPrice = pos.entryPrice * (1 - config.stopPct / 100) }
      else if (pos.trailActive && pos.trailStop && row.low <= pos.trailStop) { exitReason = 'trail_stop'; exitPrice = pos.trailStop }
      else if (pos.dayCount >= config.maxHoldDays) { exitReason = 'time_stop'; exitPrice = row.close }

      if (exitReason) {
        exitPrice *= (1 - 0.001) // slippage
        const pnl = (exitPrice - pos.entryPrice) * pos.shares
        cash += exitPrice * pos.shares
        closed.push({ ticker: pos.ticker, sector: getSector(pos.ticker), entryDate: pos.entryDate, entryPrice: Math.round(pos.entryPrice * 100) / 100, exitDate: date, exitPrice: Math.round(exitPrice * 100) / 100, shares: pos.shares, pnl: Math.round(pnl), pnlPct: Math.round(((exitPrice - pos.entryPrice) / pos.entryPrice) * 10000) / 100, holdDays: pos.dayCount, exitReason, strength: pos.strength, composite: pos.composite })
        positions.splice(p, 1)
      }
    }

    // ── Scan for entries ──
    if (positions.length < config.maxPositions && (!config.regimeFilter || regimeBullish)) {
      // Sector scores
      const secAgg = {}
      for (const [t, idx] of Object.entries(tidx)) {
        const r = indicators[t][idx]; if (!r || r.rsi === null) continue
        const s = getSector(t); if (!secAgg[s]) secAgg[s] = { m: 0, c: 0, v: 0 }
        secAgg[s].m += (r.rsi > 50 ? 1 : 0) + (r.ema9Above21 ? 0.5 : 0); secAgg[s].v += (r.volumeRatio || 1); secAgg[s].c++
      }
      const secScores = {}
      for (const [s, d] of Object.entries(secAgg)) secScores[s] = Math.min(1, (d.m / d.c / 2) * 0.7 + (d.v / d.c > 1.2 ? 0.3 : 0))

      const cands = []
      for (const [t, idx] of Object.entries(tidx)) {
        if (positions.some(p => p.ticker === t)) continue
        const r = indicators[t][idx]; if (!r || r.rsi === null || r.adx === null || r.bbPct === null) continue
        const { composite, strength } = scoreStock(r, secScores[getSector(t)] || 0)
        if (strength === 'STRONG' || (config.minStrength === 'MODERATE' && strength === 'MODERATE'))
          cands.push({ ticker: t, close: r.close, composite, strength })
      }
      cands.sort((a, b) => b.composite - a.composite)

      for (const c of cands) {
        if (positions.length >= config.maxPositions) break
        const pv = cash + positions.reduce((s, p) => s + (p.currentPrice || p.entryPrice) * p.shares, 0)
        const maxPos = pv * config.maxPositionPct
        const shares = Math.max(1, Math.min(Math.floor(pv * config.riskPerTrade / (c.close * config.stopPct / 100)), Math.floor(maxPos / c.close)))
        const cost = c.close * shares * 1.001
        if (cost > cash) continue
        cash -= cost
        positions.push({ ticker: c.ticker, entryDate: date, entryPrice: c.close * 1.001, shares, strength: c.strength, composite: c.composite, dayCount: 0, currentPrice: c.close, trailActive: false, trailStop: null })
      }
    }

    // ── Equity ──
    const inv = positions.reduce((s, p) => { const idx = tidx[p.ticker]; const pr = idx !== undefined ? indicators[p.ticker][idx].close : p.currentPrice; return s + pr * p.shares }, 0)
    const tv = cash + inv
    if (tv > peak) peak = tv
    const dd = peak > 0 ? ((peak - tv) / peak) * 100 : 0
    if (dd > maxDD) maxDD = dd
    equity.push({ date, value: Math.round(tv), positions: positions.length })
  }

  // Close remaining
  const lastDay = tradingDays[tradingDays.length - 1]
  for (const pos of positions) {
    const idx = dateIdx[lastDay]?.[pos.ticker]
    const ep = idx !== undefined ? indicators[pos.ticker][idx].close * 0.999 : pos.currentPrice
    cash += ep * pos.shares
    closed.push({ ticker: pos.ticker, sector: getSector(pos.ticker), entryDate: pos.entryDate, entryPrice: Math.round(pos.entryPrice * 100) / 100, exitDate: lastDay, exitPrice: Math.round(ep * 100) / 100, shares: pos.shares, pnl: Math.round((ep - pos.entryPrice) * pos.shares), pnlPct: Math.round(((ep - pos.entryPrice) / pos.entryPrice) * 10000) / 100, holdDays: pos.dayCount, exitReason: 'end_of_sim', strength: pos.strength, composite: pos.composite })
  }

  // Metrics
  const endVal = equity[equity.length - 1]?.value || config.startingCapital
  const ret = ((endVal - config.startingCapital) / config.startingCapital) * 100
  const wins = closed.filter(t => t.pnl > 0), losses = closed.filter(t => t.pnl <= 0)
  const gw = wins.reduce((s, t) => s + t.pnl, 0), gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const dr = []; for (let i = 1; i < equity.length; i++) { const p = equity[i - 1].value; if (p > 0) dr.push((equity[i].value - p) / p) }
  const mn = dr.length > 0 ? dr.reduce((a, b) => a + b, 0) / dr.length : 0
  const sd = dr.length > 0 ? Math.sqrt(dr.reduce((s, r) => s + (r - mn) ** 2, 0) / dr.length) : 0
  const sharpe = sd > 0 ? (mn / sd) * Math.sqrt(252) : 0

  const byExit = {}; closed.forEach(t => { byExit[t.exitReason] = (byExit[t.exitReason] || 0) + 1 })
  const byStr = {}
  for (const str of ['STRONG', 'MODERATE']) {
    const b = closed.filter(t => t.strength === str), w = b.filter(t => t.pnl > 0)
    byStr[str] = { count: b.length, winRate: b.length > 0 ? Math.round(w.length / b.length * 1000) / 10 : 0, avgReturn: b.length > 0 ? Math.round(b.reduce((s, t) => s + t.pnlPct, 0) / b.length * 100) / 100 : 0 }
  }

  return {
    endingValue: endVal, totalReturnPct: Math.round(ret * 100) / 100, maxDrawdown: Math.round(maxDD * 100) / 100,
    sharpeRatio: Math.round(sharpe * 100) / 100, totalTrades: closed.length,
    winners: wins.length, losers: losses.length,
    winRate: closed.length > 0 ? Math.round(wins.length / closed.length * 1000) / 10 : 0,
    avgWin: wins.length > 0 ? Math.round(wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round(losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length * 100) / 100 : 0,
    profitFactor: gl > 0 ? Math.round(gw / gl * 100) / 100 : gw > 0 ? 99 : 0,
    avgHoldDays: closed.length > 0 ? Math.round(closed.reduce((s, t) => s + t.holdDays, 0) / closed.length * 10) / 10 : 0,
    byExit, byStrength: byStr, equity, trades: closed,
  }
}

// ── Main ─────────────────────────────────────────

function main() {
  const start = Date.now()
  console.log('Loading data...')
  const allStocks = loadAll()
  const tickers = Object.keys(allStocks)
  console.log(`Loaded ${tickers.length} stocks`)

  const sectorMap = loadSectors()
  const getSector = t => sectorMap[t] || 'Others'

  console.log('Computing indicators...')
  const indicators = {}
  for (const t of tickers) indicators[t] = computeInd(allStocks[t])

  const dateIdx = {}
  for (const t of tickers) for (let i = 0; i < indicators[t].length; i++) {
    const d = indicators[t][i].date
    if (d >= '2025-01-01' && d <= '2026-03-27') { if (!dateIdx[d]) dateIdx[d] = {}; dateIdx[d][t] = i }
  }
  const tradingDays = Object.keys(dateIdx).sort()
  console.log(`Trading days: ${tradingDays.length}`)

  // ── Define scenarios ──
  const base = { startingCapital: 1000000, riskPerTrade: 0.015, maxPositionPct: 0.10, maxPositions: 10, minStrength: 'MODERATE', regimeFilter: false, trailingStop: false }

  const scenarios = {
    'Baseline (+5/-3)': { ...base, targetPct: 5, stopPct: 3, maxHoldDays: 5 },
    'Sim1: Symmetric (+3/-3)': { ...base, targetPct: 3, stopPct: 3, maxHoldDays: 5 },
    'Sim2: Regime Filter (+5/-3)': { ...base, targetPct: 5, stopPct: 3, maxHoldDays: 5, regimeFilter: true },
    'Sim3: Trailing Stop (+5/-2, trail)': { ...base, targetPct: 5, stopPct: 2, maxHoldDays: 5, trailingStop: true, trailActivate: 2, trailPct: 1.5 },
    'Sim4: Regime+Symmetric (+3/-3)': { ...base, targetPct: 3, stopPct: 3, maxHoldDays: 5, regimeFilter: true },
    'Sim5: STRONG only + Regime (+5/-3)': { ...base, targetPct: 5, stopPct: 3, maxHoldDays: 5, regimeFilter: true, minStrength: 'STRONG' },
  }

  const results = {}
  for (const [name, config] of Object.entries(scenarios)) {
    process.stdout.write(`Running: ${name}...`)
    const r = runSim(config, indicators, dateIdx, tradingDays, getSector)
    results[name] = { ...r, config }
    // Don't store full equity/trades in comparison output
    delete results[name].equity
    delete results[name].trades
    console.log(` done (${r.totalTrades} trades, ${r.totalReturnPct}%)`)
  }

  // ── Print comparison ──
  console.log('\n' + '='.repeat(90))
  console.log('  STRATEGY COMPARISON')
  console.log('='.repeat(90))
  console.log('')
  console.log('Strategy'.padEnd(32) + 'Return'.padStart(8) + '  MaxDD'.padStart(8) + ' Sharpe'.padStart(7) + ' Trades'.padStart(7) + '   WR%'.padStart(7) + '    PF'.padStart(7) + ' AvgWin'.padStart(7) + ' AvgLos'.padStart(7))
  console.log('-'.repeat(90))

  for (const [name, r] of Object.entries(results)) {
    const ret = (r.totalReturnPct >= 0 ? '+' : '') + r.totalReturnPct.toFixed(1) + '%'
    const highlight = r.totalReturnPct > 0 ? ' <<<' : ''
    console.log(
      name.padEnd(32) +
      ret.padStart(8) +
      ('-' + r.maxDrawdown.toFixed(1) + '%').padStart(8) +
      r.sharpeRatio.toFixed(2).padStart(7) +
      String(r.totalTrades).padStart(7) +
      (r.winRate.toFixed(1) + '%').padStart(7) +
      r.profitFactor.toFixed(2).padStart(7) +
      ('+' + r.avgWin.toFixed(1) + '%').padStart(7) +
      (r.avgLoss.toFixed(1) + '%').padStart(7) +
      highlight
    )
  }

  console.log('')
  console.log('Exit breakdown:')
  console.log('Strategy'.padEnd(32) + 'Target'.padStart(8) + '  Stop'.padStart(8) + '  Time'.padStart(8) + ' Trail'.padStart(8))
  console.log('-'.repeat(64))
  for (const [name, r] of Object.entries(results)) {
    console.log(
      name.padEnd(32) +
      String(r.byExit.target_hit || 0).padStart(8) +
      String(r.byExit.stop_loss || 0).padStart(8) +
      String(r.byExit.time_stop || 0).padStart(8) +
      String(r.byExit.trail_stop || 0).padStart(8)
    )
  }

  console.log('')
  console.log('By strength:')
  for (const [name, r] of Object.entries(results)) {
    const s = r.byStrength.STRONG || { count: 0, winRate: 0 }
    const m = r.byStrength.MODERATE || { count: 0, winRate: 0 }
    console.log(`  ${name}: STRONG ${s.count}t/${s.winRate}%WR/${s.avgReturn || 0}%avg | MODERATE ${m.count}t/${m.winRate}%WR/${m.avgReturn || 0}%avg`)
  }

  // ── Find winner ──
  const sorted = Object.entries(results).sort((a, b) => b[1].totalReturnPct - a[1].totalReturnPct)
  console.log('\n' + '='.repeat(90))
  console.log(`  WINNER: ${sorted[0][0]}`)
  console.log(`  Return: ${sorted[0][1].totalReturnPct >= 0 ? '+' : ''}${sorted[0][1].totalReturnPct}% | Sharpe: ${sorted[0][1].sharpeRatio} | WR: ${sorted[0][1].winRate}% | PF: ${sorted[0][1].profitFactor}`)
  console.log('='.repeat(90))

  // Save
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const output = { scenarios: results, winner: sorted[0][0], generatedAt: new Date().toISOString(), elapsed: parseFloat(elapsed) }
  fs.writeFileSync(path.join(RESULTS_DIR, 'portfolio_sim_alternatives.json'), JSON.stringify(output, null, 2))
  fs.writeFileSync(path.join(UI_DIR, 'portfolioSimAlternatives.json'), JSON.stringify(output, null, 2))
  console.log(`\nSaved to results/portfolio_sim_alternatives.json (${elapsed}s)`)
}

main()
