import { portfolioData, tradeData, featureData, walkForwardData } from './data/loadData'

const INITIAL_CAPITAL = 1_000_000

export const fetchOverview = () => {
  const portfolio = {
    total_value: INITIAL_CAPITAL, cash: 0, invested: 0,
    total_return_pct: 0, drawdown_pct: 0, peak_value: INITIAL_CAPITAL, n_positions: 0,
  }
  let equity_curve = []
  const metrics = {
    total_trades: 0, win_rate: 0, profit_factor: 0,
    avg_win: 0, avg_loss: 0, avg_hold_days: 0, sharpe_ratio: 0,
  }

  if (portfolioData.length > 0) {
    equity_curve = portfolioData.slice(-500).map(r => ({
      date: r.date || '',
      value: parseFloat(r.total_value) || INITIAL_CAPITAL,
      regime: r.regime || '',
    }))
    const lastVal = parseFloat(portfolioData[portfolioData.length - 1].total_value) || INITIAL_CAPITAL
    const peakVal = Math.max(...portfolioData.map(r => parseFloat(r.total_value) || 0))
    portfolio.total_value = Math.round(lastVal * 100) / 100
    portfolio.total_return_pct = Math.round((lastVal / INITIAL_CAPITAL - 1) * 10000) / 100
    portfolio.peak_value = Math.round(peakVal * 100) / 100
    portfolio.drawdown_pct = Math.round((lastVal - peakVal) / Math.max(peakVal, 1) * 10000) / 100
  }

  if (tradeData.length > 0) {
    const returns = tradeData.map(t => parseFloat(t.return_pct) || 0)
    const pnls = tradeData.map(t => parseFloat(t.net_pnl) || 0)
    const holds = tradeData.map(t => parseFloat(t.hold_days) || 0)
    const wins = returns.filter(r => r > 0)
    const losses = returns.filter(r => r <= 0)
    const winPnls = pnls.filter((_, i) => returns[i] > 0)
    const lossPnls = pnls.filter((_, i) => returns[i] <= 0)

    metrics.total_trades = tradeData.length
    metrics.win_rate = Math.round(wins.length / tradeData.length * 1000) / 10
    metrics.avg_win = wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0
    metrics.avg_loss = losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0
    const grossWin = winPnls.reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(lossPnls.reduce((a, b) => a + b, 0))
    metrics.profit_factor = grossLoss > 0 ? Math.round(grossWin / grossLoss * 100) / 100 : 0
    metrics.avg_hold_days = holds.length > 0 ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length * 10) / 10 : 0
  }

  return Promise.resolve({ portfolio, equity_curve, metrics })
}

export const fetchPositions = () => {
  const features = featureData.map(r => ({
    feature: r.feature,
    importance: Math.round(parseFloat(r.importance) * 10000) / 10000,
  })).sort((a, b) => b.importance - a.importance)
  return Promise.resolve(features)
}

export const fetchSignals = () => {
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
  return Promise.resolve({ folds, message: 'Walk-forward analysis results' })
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

  const stats = {
    total_trades: trades.length,
    win_rate: Math.round(wins.length / trades.length * 1000) / 10,
    avg_win: wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0,
    avg_loss: losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0,
    best_trade: Math.round(Math.max(...returns) * 100) / 100,
    worst_trade: Math.round(Math.min(...returns) * 100) / 100,
    avg_hold_days: Math.round(trades.reduce((s, t) => s + t.hold_days, 0) / trades.length * 10) / 10,
  }

  const byExitReason = {}
  trades.forEach(t => {
    const reason = t.exit_reason || 'unknown'
    byExitReason[reason] = (byExitReason[reason] || 0) + 1
  })
  stats.by_exit_reason = byExitReason

  return Promise.resolve(stats)
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

// CSV export: generate blob URL on demand
let _exportURL = null
export const getExportURL = () => {
  if (!_exportURL) {
    const blob = new Blob([tradeData.length ? Object.keys(tradeData[0]).join(',') + '\n' + tradeData.map(r => Object.values(r).join(',')).join('\n') : ''], { type: 'text/csv' })
    _exportURL = URL.createObjectURL(blob)
  }
  return _exportURL
}
export const EXPORT_URL = '#'

// Stubs for Backtest.jsx (requires backend)
export const runBacktest = () => Promise.reject(new Error('Backtest requires a running backend server'))
export const getBacktestResult = () => Promise.resolve({ status: 'error', error: 'Backend not available' })
export const getBacktestHistory = () => Promise.resolve([])
