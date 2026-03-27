/**
 * NSE India data fetching utilities
 * Provides index data, market breadth, and sector performance
 */

const NSE_BASE = 'https://www.nseindia.com/api'
const PROXY_BASE = import.meta.env.VITE_NSE_PROXY || ''

// NSE blocks direct browser requests; use a proxy or fallback to demo data
async function nseGet(path) {
  const url = PROXY_BASE ? `${PROXY_BASE}${path}` : `${NSE_BASE}${path}`
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    })
    if (!res.ok) throw new Error(`NSE ${res.status}`)
    return await res.json()
  } catch {
    return null
  }
}

// ── Index data ────────────────────────────────────
export async function fetchIndices() {
  const data = await nseGet('/allIndices')
  if (data?.data) {
    const want = ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY MIDCAP 50', 'INDIA VIX']
    return data.data
      .filter(d => want.includes(d.index))
      .map(d => ({
        name: d.index,
        value: d.last,
        change: d.percentChange,
        changeAbs: d.last - d.previousClose,
        open: d.open,
        high: d.high,
        low: d.low,
        previousClose: d.previousClose,
      }))
  }
  return getDemoIndices()
}

// ── Market breadth ────────────────────────────────
export async function fetchMarketBreadth() {
  const data = await nseGet('/marketStatus')
  if (data?.marketState) {
    const nse = data.marketState.find(m => m.market === 'Capital Market')
    if (nse) return { advances: nse.advances || 0, declines: nse.declines || 0, unchanged: nse.unchanged || 0 }
  }
  return getDemoBreadth()
}

// ── Sector performance ────────────────────────────
export async function fetchSectorPerformance() {
  const data = await nseGet('/allIndices')
  if (data?.data) {
    const sectors = [
      'NIFTY BANK', 'NIFTY IT', 'NIFTY PHARMA', 'NIFTY AUTO',
      'NIFTY METAL', 'NIFTY FMCG', 'NIFTY ENERGY', 'NIFTY REALTY',
      'NIFTY INFRA', 'NIFTY MEDIA', 'NIFTY PSE',
    ]
    return data.data
      .filter(d => sectors.includes(d.index))
      .map(d => ({
        name: d.index.replace('NIFTY ', ''),
        change: d.percentChange,
        value: d.last,
      }))
      .sort((a, b) => b.change - a.change)
  }
  return getDemoSectors()
}

// ── Demo data fallbacks ───────────────────────────
export function getDemoIndices() {
  return [
    { name: 'NIFTY 50', value: 22456.80, change: -0.42, changeAbs: -94.60, open: 22520, high: 22580, low: 22400, previousClose: 22551.40 },
    { name: 'NIFTY BANK', value: 48234.50, change: -0.65, changeAbs: -316.20, open: 48500, high: 48620, low: 48100, previousClose: 48550.70 },
    { name: 'NIFTY IT', value: 34120.30, change: 0.82, changeAbs: 278.40, open: 33900, high: 34200, low: 33850, previousClose: 33841.90 },
    { name: 'NIFTY MIDCAP 50', value: 13456.20, change: -1.12, changeAbs: -152.30, open: 13580, high: 13600, low: 13400, previousClose: 13608.50 },
    { name: 'INDIA VIX', value: 16.42, change: 8.5, changeAbs: 1.28, open: 15.20, high: 16.80, low: 15.10, previousClose: 15.14 },
  ]
}

function getDemoBreadth() {
  return { advances: 782, declines: 1243, unchanged: 89 }
}

export function getDemoSectors() {
  return [
    { name: 'IT', change: 1.82, value: 34120 },
    { name: 'PHARMA', change: 0.65, value: 18234 },
    { name: 'FMCG', change: 0.22, value: 52100 },
    { name: 'AUTO', change: -0.15, value: 21450 },
    { name: 'ENERGY', change: -0.42, value: 28900 },
    { name: 'BANK', change: -0.65, value: 48234 },
    { name: 'METAL', change: -1.24, value: 7890 },
    { name: 'REALTY', change: -1.85, value: 842 },
    { name: 'INFRA', change: -0.95, value: 6234 },
    { name: 'MEDIA', change: -2.10, value: 1890 },
    { name: 'PSE', change: -0.78, value: 9120 },
  ]
}

// ── Market status ─────────────────────────────────
export function getMarketStatus() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hr = ist.getHours(), min = ist.getMinutes(), day = ist.getDay()
  const t = hr * 60 + min
  const isWeekday = day >= 1 && day <= 5

  if (!isWeekday) return { status: 'closed', label: 'WEEKEND', color: 'var(--text-muted)' }
  if (t >= 555 && t <= 930) return { status: 'open', label: 'MARKET OPEN', color: 'var(--green)' }
  if (t >= 540 && t < 555) return { status: 'premarket', label: 'PRE-MARKET', color: 'var(--amber)' }
  if (t > 930 && t <= 960) return { status: 'closing', label: 'CLOSING', color: 'var(--amber)' }
  return { status: 'closed', label: 'AFTER HOURS', color: 'var(--text-muted)' }
}
