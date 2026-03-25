import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

const INITIAL_CAPITAL = 1_000_000

function readCSV(filename) {
  try {
    const csv = readFileSync(join(process.cwd(), 'results', filename), 'utf8')
    return parse(csv, { columns: true, skip_empty_lines: true })
  } catch {
    return []
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const portfolio = {
    total_value: INITIAL_CAPITAL, cash: 0, invested: 0,
    total_return_pct: 0, drawdown_pct: 0, peak_value: INITIAL_CAPITAL, n_positions: 0,
  }
  let equity_curve = []
  const stats = {
    total_trades: 0, win_rate: 0, profit_factor: 0,
    avg_win: 0, avg_loss: 0, avg_hold_days: 0, sharpe_ratio: 0,
  }

  // Equity curve from portfolio_history.csv
  const rows = readCSV('portfolio_history.csv')
  if (rows.length > 0) {
    equity_curve = rows.slice(-500).map(r => ({
      date: r.date || '',
      value: parseFloat(r.total_value) || INITIAL_CAPITAL,
      regime: r.regime || '',
    }))
    const lastVal = parseFloat(rows[rows.length - 1].total_value) || INITIAL_CAPITAL
    const peakVal = Math.max(...rows.map(r => parseFloat(r.total_value) || 0))
    portfolio.total_value = Math.round(lastVal * 100) / 100
    portfolio.total_return_pct = Math.round((lastVal / INITIAL_CAPITAL - 1) * 10000) / 100
    portfolio.peak_value = Math.round(peakVal * 100) / 100
    portfolio.drawdown_pct = Math.round((lastVal - peakVal) / Math.max(peakVal, 1) * 10000) / 100
  }

  // Trade stats from trade_log.csv
  const trades = readCSV('trade_log.csv')
  if (trades.length > 0) {
    const returns = trades.map(t => parseFloat(t.return_pct) || 0)
    const pnls = trades.map(t => parseFloat(t.net_pnl) || 0)
    const holds = trades.map(t => parseFloat(t.hold_days) || 0)
    const wins = returns.filter(r => r > 0)
    const losses = returns.filter(r => r <= 0)
    const winPnls = pnls.filter((_, i) => returns[i] > 0)
    const lossPnls = pnls.filter((_, i) => returns[i] <= 0)

    stats.total_trades = trades.length
    stats.win_rate = trades.length > 0 ? Math.round(wins.length / trades.length * 1000) / 10 : 0
    stats.avg_win = wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0
    stats.avg_loss = losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0
    const grossWin = winPnls.reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(lossPnls.reduce((a, b) => a + b, 0))
    stats.profit_factor = grossLoss > 0 ? Math.round(grossWin / grossLoss * 100) / 100 : 0
    stats.avg_hold_days = holds.length > 0 ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length * 10) / 10 : 0
  }

  res.json({ portfolio, equity_curve, metrics: stats })
}
