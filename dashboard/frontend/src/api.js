import axios from 'axios'

const API = axios.create({ baseURL: '/api' })

export const fetchOverview = () => API.get('/overview').then(r => r.data)
export const fetchPositions = () => API.get('/features').then(r => r.data)
export const fetchSignals = () => API.get('/walkforward').then(r => r.data)
export const fetchTradeStats = () => API.get('/trades/stats').then(r => r.data)
export const fetchTrades = (p = {}) => {
  const q = new URLSearchParams()
  Object.entries(p).forEach(([k, v]) => { if (v) q.set(k, v) })
  return API.get(`/trades?${q}`).then(r => r.data)
}
export const EXPORT_URL = '/api/trades/export'
