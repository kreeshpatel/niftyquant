/**
 * P&L aggregation utilities
 * Period filtering, sector grouping, day-of-week analysis
 */

// ── Format helpers ────────────────────────────────
export function formatINR(v) {
  if (v === undefined || v === null) return '--'
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '-'
  if (abs >= 10000000) return `${sign}\u20B9${(abs / 10000000).toFixed(2)}Cr`
  if (abs >= 100000) return `${sign}\u20B9${(abs / 100000).toFixed(2)}L`
  if (abs >= 1000) return `${sign}\u20B9${(abs / 1000).toFixed(1)}K`
  return `${sign}\u20B9${abs.toLocaleString('en-IN')}`
}

export function formatLakh(v) {
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(2)}Cr`
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(2)}L`
  return `\u20B9${v.toLocaleString('en-IN')}`
}

export function formatPct(v) {
  if (v === undefined || v === null) return '--'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

// ── Period helpers ────────────────────────────────
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfFY(date) {
  const d = new Date(date)
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return new Date(fy, 3, 1)
}

// ── P&L by period ─────────────────────────────────
export function pnlByPeriod(trades, now = new Date()) {
  const today = startOfDay(now)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)
  const fyStart = startOfFY(now)

  const sumPnl = (filtered) => filtered.reduce((s, t) => s + (t.pnl || 0), 0)
  const sumPct = (filtered) => {
    if (!filtered.length) return 0
    return filtered.reduce((s, t) => s + (t.pnl_pct || 0), 0) / filtered.length
  }

  const byDate = (start) => trades.filter(t => {
    const d = new Date(t.exit_date || t.entry_date)
    return d >= start
  })

  const todayTrades = byDate(today)
  const weekTrades = byDate(weekStart)
  const monthTrades = byDate(monthStart)
  const fyTrades = byDate(fyStart)

  return {
    today: { pnl: sumPnl(todayTrades), pct: sumPct(todayTrades), trades: todayTrades.length },
    week: { pnl: sumPnl(weekTrades), pct: sumPct(weekTrades), trades: weekTrades.length },
    month: { pnl: sumPnl(monthTrades), pct: sumPct(monthTrades), trades: monthTrades.length },
    fy: { pnl: sumPnl(fyTrades), pct: sumPct(fyTrades), trades: fyTrades.length },
    allTime: { pnl: sumPnl(trades), pct: sumPct(trades), trades: trades.length },
  }
}

// ── P&L by sector ─────────────────────────────────
export function pnlBySector(trades) {
  const sectors = {}
  trades.forEach(t => {
    const s = t.sector || 'Other'
    if (!sectors[s]) sectors[s] = { pnl: 0, trades: 0, wins: 0 }
    sectors[s].pnl += t.pnl || 0
    sectors[s].trades++
    if ((t.pnl || 0) > 0) sectors[s].wins++
  })
  return Object.entries(sectors)
    .map(([sector, d]) => ({
      sector,
      pnl: d.pnl,
      trades: d.trades,
      winRate: d.trades > 0 ? Math.round(d.wins / d.trades * 100) : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)
}

// ── P&L by day of week ───────────────────────────
export function pnlByDayOfWeek(trades) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const buckets = days.map(d => ({ day: d, pnl: 0, trades: 0, wins: 0 }))

  trades.forEach(t => {
    const d = new Date(t.exit_date || t.entry_date)
    const dow = d.getDay()
    buckets[dow].pnl += t.pnl || 0
    buckets[dow].trades++
    if ((t.pnl || 0) > 0) buckets[dow].wins++
  })

  return buckets.filter(b => b.trades > 0) // exclude weekends
}

// ── Monthly returns grid ──────────────────────────
export function monthlyReturnsGrid(trades) {
  const months = {}
  trades.forEach(t => {
    const d = new Date(t.exit_date || t.entry_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months[key]) months[key] = { pnl: 0, trades: 0 }
    months[key].pnl += t.pnl || 0
    months[key].trades++
  })

  return Object.entries(months)
    .map(([key, d]) => {
      const [year, month] = key.split('-').map(Number)
      return { year, month, pnl: d.pnl, trades: d.trades }
    })
    .sort((a, b) => a.year - b.year || a.month - b.month)
}

// ── Equity curve from trades ──────────────────────
export function buildEquityCurve(trades, initialCapital = 3240000) {
  let equity = initialCapital
  const curve = [{ date: trades[0]?.entry_date || '', value: initialCapital }]

  const sorted = [...trades]
    .filter(t => t.exit_date)
    .sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date))

  sorted.forEach(t => {
    equity += t.pnl || 0
    curve.push({ date: t.exit_date, value: equity })
  })

  return curve
}
