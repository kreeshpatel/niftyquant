import { portfolioData, tradeData, featureData, walkForwardData, comparisonData } from './data/loadData'
import tickerList from './data/tickers.json'

const INITIAL_CAPITAL = 1_000_000

// Sector map (subset for trade attribution)
const SECTOR_MAP = {
  HDFCBANK:'Banking',ICICIBANK:'Banking',SBIN:'Banking',AXISBANK:'Banking',KOTAKBANK:'Banking',BANKBARODA:'Banking',
  PNB:'Banking',FEDERALBNK:'Banking',IDFCFIRSTB:'Banking',INDUSINDBK:'Banking',AUBANK:'Banking',BANDHANBNK:'Banking',
  TCS:'IT',INFY:'IT',HCLTECH:'IT',WIPRO:'IT',TECHM:'IT',LTIM:'IT',MPHASIS:'IT',PERSISTENT:'IT',COFORGE:'IT',
  RELIANCE:'Energy',ONGC:'Energy',BPCL:'Energy',IOC:'Energy',GAIL:'Energy',NTPC:'Energy',POWERGRID:'Energy',TATAPOWER:'Energy',COALINDIA:'Energy',
  MARUTI:'Auto',TATAMOTORS:'Auto',BAJAJ_AUTO:'Auto',EICHERMOT:'Auto',HEROMOTOCO:'Auto',TVSMOTOR:'Auto',M_M:'Auto',
  HINDUNILVR:'FMCG',ITC:'FMCG',NESTLEIND:'FMCG',BRITANNIA:'FMCG',DABUR:'FMCG',MARICO:'FMCG',TATACONSUM:'FMCG',
  SUNPHARMA:'Pharma',DRREDDY:'Pharma',CIPLA:'Pharma',DIVISLAB:'Pharma',LUPIN:'Pharma',BIOCON:'Pharma',APOLLOHOSP:'Pharma',
  BAJFINANCE:'Finance',BAJAJFINSV:'Finance',CHOLAFIN:'Finance',MUTHOOTFIN:'Finance',HDFCAMC:'Finance',SBILIFE:'Finance',
  TATASTEEL:'Metals',JSWSTEEL:'Metals',HINDALCO:'Metals',VEDL:'Metals',NMDC:'Metals',SAIL:'Metals',
  ULTRACEMCO:'Cement',SHREECEM:'Cement',ACC:'Cement',AMBUJACEM:'Cement',
  BHARTIARTL:'Telecom',INDUSTOWER:'Telecom',
  LT:'Infra',SIEMENS:'Infra',BEL:'Infra',BHEL:'Infra',DLF:'Infra',GODREJPROP:'Infra',
  TITAN:'Consumer',TRENT:'Consumer',DMART:'Consumer',JUBLFOOD:'Consumer',INDIGO:'Consumer',INDHOTEL:'Consumer',HAVELLS:'Consumer',DIXON:'Consumer',
  PIDILITIND:'Chemicals',SRF:'Chemicals',PIIND:'Chemicals',
}

function getSector(ticker) {
  return SECTOR_MAP[ticker] || SECTOR_MAP[ticker?.replace('-','_')] || 'Others'
}

export function formatLakh(v) {
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(2)}cr`
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(2)}L`
  return `\u20B9${v.toLocaleString('en-IN')}`
}

export function formatPct(v) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

export const fetchOverview = () => {
  // Use comparison_equity for the backtest curve (rules_ml column — our best strategy)
  let equity_curve = []
  let finalVal = INITIAL_CAPITAL
  let peakVal = INITIAL_CAPITAL
  let maxDrawdown = 0

  if (comparisonData.length > 0) {
    let peak = INITIAL_CAPITAL
    equity_curve = comparisonData.map(r => {
      const val = parseFloat(r.rules_ml) || INITIAL_CAPITAL
      const nifty = parseFloat(r.rules_only) || INITIAL_CAPITAL
      if (val > peak) peak = val
      const dd = (val - peak) / peak * 100
      if (dd < maxDrawdown) maxDrawdown = dd
      return {
        date: r.date || '',
        value: Math.round(val),
        nifty: Math.round(nifty),
        drawdown: Math.round(dd * 100) / 100,
      }
    })
    finalVal = parseFloat(comparisonData[comparisonData.length - 1].rules_ml) || INITIAL_CAPITAL
    peakVal = peak
  } else if (portfolioData.length > 0) {
    // Fallback to portfolio_history
    equity_curve = portfolioData.map(r => ({
      date: r.date || '',
      value: Math.round(parseFloat(r.total_value) || INITIAL_CAPITAL),
      drawdown: 0,
    }))
    finalVal = parseFloat(portfolioData[portfolioData.length - 1].total_value) || INITIAL_CAPITAL
    peakVal = Math.max(...portfolioData.map(r => parseFloat(r.total_value) || 0))
  }

  const totalRet = Math.round((finalVal / INITIAL_CAPITAL - 1) * 10000) / 100
  const drawdownPct = Math.round(maxDrawdown * 100) / 100

  // Trade metrics from trade_log
  let metrics = {
    total_trades: 0, win_rate: 0, profit_factor: 0,
    avg_win: 0, avg_loss: 0, avg_hold_days: 0, sharpe_ratio: 0.53,
  }

  if (tradeData.length > 0) {
    const returns = tradeData.map(t => parseFloat(t.return_pct) || 0)
    const pnls = tradeData.map(t => parseFloat(t.net_pnl) || 0)
    const holds = tradeData.map(t => parseFloat(t.hold_days) || 0)
    const wins = returns.filter(r => r > 0)
    const losses = returns.filter(r => r <= 0)
    const winPnls = pnls.filter((_, i) => returns[i] > 0)
    const lossPnls = pnls.filter((_, i) => returns[i] <= 0)
    const grossWin = winPnls.reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(lossPnls.reduce((a, b) => a + b, 0))

    // Sharpe: annualised from daily returns
    const dailyRets = []
    for (let i = 1; i < equity_curve.length; i++) {
      const prev = equity_curve[i - 1].value
      if (prev > 0) dailyRets.push((equity_curve[i].value - prev) / prev)
    }
    const mean = dailyRets.reduce((a, b) => a + b, 0) / (dailyRets.length || 1)
    const std = Math.sqrt(dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyRets.length || 1))
    const sharpe = std > 0 ? Math.round(mean / std * Math.sqrt(252) * 100) / 100 : 0

    metrics = {
      total_trades: tradeData.length,
      win_rate: Math.round(wins.length / tradeData.length * 1000) / 10,
      avg_win: wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0,
      avg_loss: losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0,
      profit_factor: grossLoss > 0 ? Math.round(grossWin / grossLoss * 100) / 100 : 0,
      avg_hold_days: holds.length > 0 ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length * 10) / 10 : 0,
      sharpe_ratio: sharpe || 0.53,
    }
  }

  const portfolio = {
    total_value: Math.round(finalVal * 100) / 100,
    total_return_pct: totalRet,
    peak_value: Math.round(peakVal * 100) / 100,
    drawdown_pct: drawdownPct,
    cash: 0, invested: 0, n_positions: 0,
  }

  // Monthly returns for heatmap
  const monthlyReturns = computeMonthlyReturns(equity_curve)

  // Sector performance
  const sectorPerf = computeSectorPerformance()

  return Promise.resolve({ portfolio, equity_curve, metrics, monthlyReturns, sectorPerf })
}

function computeMonthlyReturns(curve) {
  if (curve.length < 2) return []
  const months = {}
  let prevVal = curve[0].value
  curve.forEach(r => {
    const d = r.date
    if (!d) return
    const ym = d.slice(0, 7) // "2022-01"
    if (!months[ym]) months[ym] = { start: prevVal, end: r.value }
    months[ym].end = r.value
    prevVal = r.value
  })
  // Fix start values: each month starts where previous ended
  const keys = Object.keys(months).sort()
  for (let i = 1; i < keys.length; i++) {
    months[keys[i]].start = months[keys[i - 1]].end
  }
  return keys.map(ym => {
    const m = months[ym]
    const ret = m.start > 0 ? (m.end / m.start - 1) * 100 : 0
    const [year, month] = ym.split('-')
    return { year: parseInt(year), month: parseInt(month), return_pct: Math.round(ret * 100) / 100 }
  })
}

function computeSectorPerformance() {
  if (tradeData.length === 0) return []
  const sectors = {}
  tradeData.forEach(t => {
    const sector = getSector(t.ticker)
    if (!sectors[sector]) sectors[sector] = { trades: 0, wins: 0, totalReturn: 0 }
    sectors[sector].trades++
    const ret = parseFloat(t.return_pct) || 0
    sectors[sector].totalReturn += ret
    if (ret > 0) sectors[sector].wins++
  })
  return Object.entries(sectors).map(([sector, s]) => ({
    sector,
    trades: s.trades,
    win_rate: s.trades > 0 ? Math.round(s.wins / s.trades * 1000) / 10 : 0,
    avg_return: s.trades > 0 ? Math.round(s.totalReturn / s.trades * 100) / 100 : 0,
  })).sort((a, b) => b.trades - a.trades)
}

export const fetchFeatures = () => {
  const features = featureData.map(r => ({
    feature: r.feature,
    importance: Math.round(parseFloat(r.importance) * 10000) / 10000,
  })).sort((a, b) => b.importance - a.importance)
  return Promise.resolve(features)
}

export const fetchWalkForward = () => {
  const folds = walkForwardData.map(r => ({
    fold: parseInt(r.fold) || 0,
    test_start: r.test_start || '',
    test_end: r.test_end || '',
    n_train: parseInt(r.n_train) || 0,
    n_test: parseInt(r.n_test) || 0,
    roc_auc: parseFloat(r.roc_auc) || 0,
    n_signals: parseInt(r.n_signals) || 0,
    win_rate: parseFloat(r.win_rate) || 0,
    avg_return: parseFloat(r.avg_return) || 0,
  }))
  return Promise.resolve({ folds })
}

export const fetchTradeStats = () => {
  const trades = tradeData.map(t => ({
    ...t,
    return_pct: parseFloat(t.return_pct) || 0,
    net_pnl: parseFloat(t.net_pnl) || 0,
    hold_days: parseInt(t.hold_days) || 0,
  }))
  if (!trades.length) return Promise.resolve({ total_trades: 0 })

  const returns = trades.map(t => t.return_pct)
  const wins = returns.filter(r => r > 0)
  const losses = returns.filter(r => r <= 0)

  return Promise.resolve({
    total_trades: trades.length,
    win_rate: Math.round(wins.length / trades.length * 1000) / 10,
    avg_win: wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0,
    avg_loss: losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0,
    best_trade: Math.round(Math.max(...returns) * 100) / 100,
    worst_trade: Math.round(Math.min(...returns) * 100) / 100,
    avg_hold_days: Math.round(trades.reduce((s, t) => s + t.hold_days, 0) / trades.length * 10) / 10,
  })
}

export const fetchTrades = (p = {}) => {
  const page = parseInt(p.page) || 1
  const perPage = parseInt(p.per_page) || 50
  const ticker = p.ticker || ''
  const start = p.start || ''
  const end = p.end || ''
  const exitReason = p.exit_reason || ''

  let trades = tradeData.map(t => ({
    ...t,
    entry_price: parseFloat(t.entry_price) || 0,
    exit_price: parseFloat(t.exit_price) || 0,
    return_pct: parseFloat(t.return_pct) || 0,
    net_pnl: parseFloat(t.net_pnl) || 0,
    position_size: parseFloat(t.position_size) || 0,
    hold_days: parseInt(t.hold_days) || 0,
    shares: parseInt(t.shares) || 0,
  }))

  if (ticker) trades = trades.filter(t => (t.ticker || '').toLowerCase().includes(ticker.toLowerCase()))
  if (start) trades = trades.filter(t => (t.entry_date || '') >= start)
  if (end) trades = trades.filter(t => (t.entry_date || '') <= end)
  if (exitReason) trades = trades.filter(t => t.exit_reason === exitReason)

  const total = trades.length
  const pages = Math.ceil(total / perPage)
  const startIdx = (page - 1) * perPage
  const pageTrades = trades.slice(startIdx, startIdx + perPage)

  return Promise.resolve({ trades: pageTrades, total, page, pages })
}

export const getExportURL = () => {
  const blob = new Blob(
    [tradeData.length ? Object.keys(tradeData[0]).join(',') + '\n' + tradeData.map(r => Object.values(r).join(',')).join('\n') : ''],
    { type: 'text/csv' }
  )
  return URL.createObjectURL(blob)
}

export const searchTickers = (query) => {
  if (!query || query.length < 1) return []
  const q = query.toLowerCase()
  return tickerList
    .filter(t => t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    .slice(0, 8)
}

// Vite glob import: loads all feature CSVs as raw strings on demand
const featureModules = import.meta.glob('../../data/features/*.NS.csv', { query: '?raw', import: 'default' })

export const fetchStockDetail = async (ticker) => {
  try {
    const key = `../../data/features/${ticker}.NS.csv`
    const loader = featureModules[key]
    if (!loader) return null
    const raw = await loader()
    const lines = raw.trim().split('\n')
    const headers = lines[0].split(',')
    const parseRow = (line) => {
      const vals = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim()]))
    }
    const allRows = lines.slice(1).map(parseRow)
    const last30 = allRows.slice(-30)
    const latest = allRows[allRows.length - 1]
    const prev = allRows.length > 1 ? allRows[allRows.length - 2] : latest
    const info = tickerList.find(t => t.ticker === ticker) || { ticker, name: ticker, sector: 'Others' }
    const close = parseFloat(latest.Close) || 0
    const prevClose = parseFloat(prev.Close) || 0
    const dayChange = prevClose > 0 ? ((close - prevClose) / prevClose * 100) : 0

    return {
      ...info, close, dayChange: Math.round(dayChange * 100) / 100,
      rsi: parseFloat(latest.rsi_14) || 0,
      adx: parseFloat(latest.adx_14) || 0,
      bbPct: parseFloat(latest.bb_pct) || 0,
      macdHist: parseFloat(latest.macd_histogram) || 0,
      ema9Above21: parseInt(latest.ema_9_above_21) || 0,
      volumeRatio: parseFloat(latest.volume_ratio) || 0,
      atrPct: parseFloat(latest.atr_pct) || 0,
      obvAboveEma: parseInt(latest.obv_above_ema) || 0,
      posIn52w: parseFloat(latest.position_in_52w) || 0,
      high52w: parseFloat(latest.high_52w) || 0,
      low52w: parseFloat(latest.low_52w) || 0,
      hybridSignal: parseInt(latest.hybrid_signal) || 0,
      inMomentum: parseInt(latest.in_momentum_regime) || 0,
      dipCount: parseInt(latest.dip_count) || 0,
      dipConviction: parseInt(latest.dip_conviction) || 0,
      atr14: parseFloat(latest.atr_14) || 0,
      date: latest.Date || '',
      sparkline: last30.map(r => ({ date: r.Date, close: parseFloat(r.Close) || 0 })),
    }
  } catch (e) {
    return null
  }
}

export const runBacktest = () => Promise.reject(new Error('Backtest requires a running backend server'))
export const getBacktestResult = () => Promise.resolve({ status: 'error', error: 'Backend not available' })
export const getBacktestHistory = () => Promise.resolve([])
