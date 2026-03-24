import axios from 'axios'
import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

const API = axios.create({ baseURL: `${API_BASE}/api` })

export const fetchOverview = () => API.get('/overview').then(r => r.data)
export const fetchPositions = () => API.get('/positions').then(r => r.data)
export const fetchSignals = () => API.get('/signals').then(r => r.data)
export const fetchTradeStats = () => API.get('/trades/stats').then(r => r.data)
export const fetchTrades = (p = {}) => {
  const q = new URLSearchParams()
  Object.entries(p).forEach(([k, v]) => { if (v) q.set(k, v) })
  return API.get(`/trades?${q}`).then(r => r.data)
}
export const runBacktest = (p) => API.post('/backtest/run', p).then(r => r.data)
export const getBacktestResult = (id) => API.get(`/backtest/result/${id}`).then(r => r.data)
export const getBacktestHistory = () => API.get('/backtest/history').then(r => r.data)
export const EXPORT_URL = `${API_BASE}/api/trades/export`

export function useWebSocket() {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const ws = useRef(null)
  const delay = useRef(1000)

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(`${WS_BASE}/ws`)
      ws.current.onopen = () => { setConnected(true); delay.current = 1000 }
      ws.current.onmessage = (e) => {
        try { setData(JSON.parse(e.data)); setLastUpdate(new Date()) } catch {}
      }
      ws.current.onclose = () => {
        setConnected(false)
        const d = Math.min(delay.current, 30000)
        delay.current = d * 2
        setTimeout(connect, d)
      }
      ws.current.onerror = () => ws.current?.close()
    } catch {}
  }, [])

  useEffect(() => { connect(); return () => ws.current?.close() }, [connect])
  return { data, connected, lastUpdate }
}
