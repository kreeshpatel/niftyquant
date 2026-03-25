import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RESULTS_DIR = join(__dirname, '..', 'results')

function readCSV(filename) {
  try {
    const csv = readFileSync(join(RESULTS_DIR, filename), 'utf8')
    return parse(csv, { columns: true, skip_empty_lines: true })
  } catch {
    return []
  }
}

function loadAllTrades() {
  const trades = [...readCSV('trade_log.csv'), ...readCSV('paper_trades.csv')]
  return trades.map(t => ({
    ...t,
    entry_price: parseFloat(t.entry_price) || 0,
    exit_price: parseFloat(t.exit_price) || 0,
    return_pct: parseFloat(t.return_pct) || 0,
    net_pnl: parseFloat(t.net_pnl) || 0,
    position_size: parseFloat(t.position_size) || 0,
    hold_days: parseInt(t.hold_days) || 0,
    shares: parseInt(t.shares) || 0,
  }))
}

export default function handler(req, res) {
  console.log('RESULTS_DIR:', RESULTS_DIR)
  try { console.log('Files:', readdirSync(RESULTS_DIR)) } catch (e) { console.log('readdirSync error:', e.message) }
  res.setHeader('Access-Control-Allow-Origin', '*')
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname.replace(/\/+$/, '')

  if (path.endsWith('/trades/stats')) {
    return handleStats(res)
  }
  if (path.endsWith('/trades/export')) {
    return handleExport(res)
  }
  return handleList(url, res)
}

function handleList(url, res) {
  const page = parseInt(url.searchParams.get('page')) || 1
  const perPage = parseInt(url.searchParams.get('per_page')) || 50
  const ticker = url.searchParams.get('ticker') || ''
  const start = url.searchParams.get('start') || ''
  const end = url.searchParams.get('end') || ''
  const exitReason = url.searchParams.get('exit_reason') || ''

  let trades = loadAllTrades()

  if (ticker) trades = trades.filter(t => (t.ticker || '').toLowerCase().includes(ticker.toLowerCase()))
  if (start) trades = trades.filter(t => (t.entry_date || '') >= start)
  if (end) trades = trades.filter(t => (t.entry_date || '') <= end)
  if (exitReason) trades = trades.filter(t => t.exit_reason === exitReason)

  const total = trades.length
  const pages = Math.ceil(total / perPage)
  const startIdx = (page - 1) * perPage
  const pageTrades = trades.slice(startIdx, startIdx + perPage)

  res.json({ trades: pageTrades, total, page, pages })
}

function handleStats(res) {
  const trades = loadAllTrades()
  if (!trades.length) return res.json({ total_trades: 0 })

  const returns = trades.map(t => t.return_pct)
  const wins = returns.filter(r => r > 0)
  const losses = returns.filter(r => r <= 0)

  const stats = {
    total_trades: trades.length,
    win_rate: trades.length > 0 ? Math.round(wins.length / trades.length * 1000) / 10 : 0,
    avg_win: wins.length > 0 ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length * 100) / 100 : 0,
    avg_loss: losses.length > 0 ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length * 100) / 100 : 0,
    best_trade: returns.length > 0 ? Math.round(Math.max(...returns) * 100) / 100 : 0,
    worst_trade: returns.length > 0 ? Math.round(Math.min(...returns) * 100) / 100 : 0,
    avg_hold_days: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.hold_days, 0) / trades.length * 10) / 10 : 0,
  }

  const byExitReason = {}
  trades.forEach(t => {
    const reason = t.exit_reason || 'unknown'
    byExitReason[reason] = (byExitReason[reason] || 0) + 1
  })
  stats.by_exit_reason = byExitReason

  res.json(stats)
}

function handleExport(res) {
  try {
    const content = readFileSync(join(RESULTS_DIR, 'trade_log.csv'), 'utf8')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=trade_log.csv')
    res.send(content)
  } catch {
    res.json({ error: 'No trade log found' })
  }
}
