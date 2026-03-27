/**
 * Zerodha Kite Connect API wrapper
 * Supports Live mode (real API) and Demo mode (mock data)
 */

const KITE_API_BASE = 'https://api.kite.trade'
const API_KEY = import.meta.env.VITE_KITE_API_KEY || ''
const API_SECRET = import.meta.env.VITE_KITE_API_SECRET || ''
const REDIRECT_URL = import.meta.env.VITE_KITE_REDIRECT_URL || window.location.origin + '/auth/callback'

// ── Token management ──────────────────────────────
export function getAccessToken() {
  const token = localStorage.getItem('zerodha_access_token')
  const expiry = localStorage.getItem('zerodha_token_expiry')
  if (token && expiry && Date.now() < parseInt(expiry)) return token
  return null
}

export function setAccessToken(token) {
  localStorage.setItem('zerodha_access_token', token)
  // Kite tokens expire at 6 AM IST next day
  const now = new Date()
  const expiry = new Date(now)
  expiry.setHours(30, 0, 0, 0) // next day 6 AM
  localStorage.setItem('zerodha_token_expiry', expiry.getTime().toString())
}

export function clearTokens() {
  localStorage.removeItem('zerodha_access_token')
  localStorage.removeItem('zerodha_token_expiry')
  localStorage.removeItem('zerodha_user_id')
}

export function isConnected() {
  return !!getAccessToken()
}

// ── Auth flow ─────────────────────────────────────
export function getLoginURL() {
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${API_KEY}`
}

export async function exchangeToken(requestToken) {
  const checksum = await sha256(`${API_KEY}${requestToken}${API_SECRET}`)
  const res = await fetch(`${KITE_API_BASE}/session/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `api_key=${API_KEY}&request_token=${requestToken}&checksum=${checksum}`,
  })
  const data = await res.json()
  if (data.status === 'success') {
    setAccessToken(data.data.access_token)
    localStorage.setItem('zerodha_user_id', data.data.user_id)
    return data.data
  }
  throw new Error(data.message || 'Token exchange failed')
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── API helpers ───────────────────────────────────
function authHeaders(token) {
  return { 'Authorization': `token ${API_KEY}:${token}`, 'Content-Type': 'application/json' }
}

async function kiteGet(path, token) {
  const res = await fetch(`${KITE_API_BASE}${path}`, { headers: authHeaders(token) })
  const data = await res.json()
  if (data.status === 'success') return data.data
  throw new Error(data.message || 'API request failed')
}

// ── Live API calls ────────────────────────────────
export async function getHoldings(token) {
  return kiteGet('/portfolio/holdings', token)
}

export async function getPositions(token) {
  return kiteGet('/portfolio/positions', token)
}

export async function getMargins(token) {
  return kiteGet('/user/margins', token)
}

export async function getTrades(token) {
  return kiteGet('/trades', token)
}

export async function getOrders(token) {
  return kiteGet('/orders', token)
}

export async function getHistorical(token, instrumentToken, interval, from, to) {
  return kiteGet(`/instruments/historical/${instrumentToken}/${interval}?from=${from}&to=${to}`, token)
}

// ── Demo mode mock data ───────────────────────────
export function getDemoHoldings() {
  return [
    { tradingsymbol: 'TATASTEEL', quantity: 500, average_price: 142.30, last_price: 148.65, pnl: 3175, day_change_percentage: 1.2, exchange: 'NSE', instrument_token: 895745 },
    { tradingsymbol: 'HDFCBANK', quantity: 200, average_price: 1645, last_price: 1678, pnl: 6600, day_change_percentage: 0.8, exchange: 'NSE', instrument_token: 341249 },
    { tradingsymbol: 'RELIANCE', quantity: 100, average_price: 2890, last_price: 2856, pnl: -3400, day_change_percentage: -0.5, exchange: 'NSE', instrument_token: 738561 },
    { tradingsymbol: 'INFY', quantity: 150, average_price: 1534, last_price: 1512, pnl: -3300, day_change_percentage: -0.3, exchange: 'NSE', instrument_token: 408065 },
    { tradingsymbol: 'ICICIBANK', quantity: 300, average_price: 1025, last_price: 1058, pnl: 9900, day_change_percentage: 1.5, exchange: 'NSE', instrument_token: 1270529 },
    { tradingsymbol: 'BAJFINANCE', quantity: 50, average_price: 6780, last_price: 6920, pnl: 7000, day_change_percentage: 0.9, exchange: 'NSE', instrument_token: 81153 },
  ]
}

export function getDemoPositions() {
  return [
    { tradingsymbol: 'TATASTEEL', quantity: 500, average_price: 142.30, last_price: 148.65, pnl: 3175, buy_quantity: 500, sell_quantity: 0, product: 'CNC', exchange: 'NSE', day_buy_quantity: 0, day_sell_quantity: 0 },
    { tradingsymbol: 'HDFCBANK', quantity: 200, average_price: 1645, last_price: 1678, pnl: 6600, buy_quantity: 200, sell_quantity: 0, product: 'CNC', exchange: 'NSE', day_buy_quantity: 0, day_sell_quantity: 0 },
    { tradingsymbol: 'RELIANCE', quantity: 100, average_price: 2890, last_price: 2856, pnl: -3400, buy_quantity: 100, sell_quantity: 0, product: 'CNC', exchange: 'NSE', day_buy_quantity: 0, day_sell_quantity: 0 },
    { tradingsymbol: 'INFY', quantity: 150, average_price: 1534, last_price: 1512, pnl: -3300, buy_quantity: 150, sell_quantity: 0, product: 'CNC', exchange: 'NSE', day_buy_quantity: 0, day_sell_quantity: 0 },
  ]
}

export function getDemoMargins() {
  return {
    equity: {
      enabled: true,
      net: 3240000,
      available: { cash: 1380000, intraday_payin: 0, adhoc_margin: 0, collateral: 0 },
      utilised: { debits: 1860000, exposure: 0, m2m_unrealised: 12975, m2m_realised: 0, holding_sales: 0, turnover: 0 },
    }
  }
}

export function getDemoTrades() {
  return [
    { trade_id: '1001', order_id: 'O001', tradingsymbol: 'TATASTEEL', exchange: 'NSE', transaction_type: 'BUY', quantity: 500, average_price: 142.30, fill_timestamp: '2026-03-24 09:45:00', product: 'CNC' },
    { trade_id: '1002', order_id: 'O002', tradingsymbol: 'HDFCBANK', exchange: 'NSE', transaction_type: 'BUY', quantity: 200, average_price: 1645, fill_timestamp: '2026-03-22 10:15:00', product: 'CNC' },
    { trade_id: '1003', order_id: 'O003', tradingsymbol: 'RELIANCE', exchange: 'NSE', transaction_type: 'BUY', quantity: 100, average_price: 2890, fill_timestamp: '2026-03-25 11:30:00', product: 'CNC' },
    { trade_id: '1004', order_id: 'O004', tradingsymbol: 'INFY', exchange: 'NSE', transaction_type: 'BUY', quantity: 150, average_price: 1534, fill_timestamp: '2026-03-23 09:30:00', product: 'CNC' },
  ]
}
