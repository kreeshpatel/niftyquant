import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as zerodha from '../utils/zerodhaApi'
import { getSector } from '../data/sectorMap'

const PortfolioContext = createContext(null)

// ── Storage keys ──────────────────────────────────
const STORAGE_KEYS = {
  trades: 'nq_trades',
  journal: 'nq_journal',
  snapshots: 'nq_snapshots',
  settings: 'nq_settings',
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback }
  catch { return fallback }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Default settings ──────────────────────────────
const DEFAULT_SETTINGS = {
  mode: 'demo', // 'demo' | 'live'
  initialCapital: 3240000,
  riskPerTrade: 1.5,
  maxPositionSize: 10,
  currency: 'INR',
}

export function PortfolioProvider({ children }) {
  const [mode, setMode] = useState(() => loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS).mode)
  const [holdings, setHoldings] = useState([])
  const [positions, setPositions] = useState([])
  const [margins, setMargins] = useState(null)
  const [trades, setTrades] = useState(() => loadJSON(STORAGE_KEYS.trades, []))
  const [journal, setJournal] = useState(() => loadJSON(STORAGE_KEYS.journal, []))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(() => loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS))

  // Persist trades and journal
  useEffect(() => { saveJSON(STORAGE_KEYS.trades, trades) }, [trades])
  useEffect(() => { saveJSON(STORAGE_KEYS.journal, journal) }, [journal])
  useEffect(() => { saveJSON(STORAGE_KEYS.settings, settings) }, [settings])

  // ── Sync data (live or demo) ────────────────────
  const sync = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'live') {
        const token = zerodha.getAccessToken()
        if (!token) throw new Error('Not connected to Zerodha')
        const [h, p, m] = await Promise.all([
          zerodha.getHoldings(token),
          zerodha.getPositions(token),
          zerodha.getMargins(token),
        ])
        setHoldings(h.map(item => ({ ...item, sector: getSector(item.tradingsymbol) })))
        setPositions(p.net || p)
        setMargins(m)
      } else {
        setHoldings(zerodha.getDemoHoldings().map(item => ({ ...item, sector: getSector(item.tradingsymbol) })))
        setPositions(zerodha.getDemoPositions())
        setMargins(zerodha.getDemoMargins())
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mode])

  // Auto-sync on mount
  useEffect(() => { sync() }, [sync])

  // ── Derived values ──────────────────────────────
  const totalDeployed = holdings.reduce((s, h) => s + h.last_price * h.quantity, 0)
  const totalCash = margins?.equity?.available?.cash || (mode === 'demo' ? 1380000 : 0)
  const totalCapital = totalDeployed + totalCash
  const todayPnl = holdings.reduce((s, h) => s + h.pnl, 0)
  const utilization = totalCapital > 0 ? (totalDeployed / totalCapital * 100) : 0

  // ── Trade management ────────────────────────────
  const addTrade = useCallback((trade) => {
    const id = crypto.randomUUID()
    const newTrade = {
      id,
      ...trade,
      sector: getSector(trade.ticker),
      pnl: trade.exit_price ? (trade.exit_price - trade.entry_price) * trade.quantity * (trade.side === 'SHORT' ? -1 : 1) : 0,
      pnl_pct: trade.exit_price ? ((trade.exit_price - trade.entry_price) / trade.entry_price * 100 * (trade.side === 'SHORT' ? -1 : 1)) : 0,
      created_at: new Date().toISOString(),
    }
    setTrades(prev => [newTrade, ...prev])
    return id
  }, [])

  const updateTrade = useCallback((id, updates) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...updates }
      if (updates.exit_price) {
        updated.pnl = (updated.exit_price - updated.entry_price) * updated.quantity * (updated.side === 'SHORT' ? -1 : 1)
        updated.pnl_pct = (updated.exit_price - updated.entry_price) / updated.entry_price * 100 * (updated.side === 'SHORT' ? -1 : 1)
      }
      return updated
    }))
  }, [])

  const deleteTrade = useCallback((id) => {
    setTrades(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Journal management ──────────────────────────
  const addJournalEntry = useCallback((entry) => {
    const id = crypto.randomUUID()
    const newEntry = { id, ...entry, created_at: new Date().toISOString() }
    setJournal(prev => [newEntry, ...prev])
    return id
  }, [])

  const updateJournalEntry = useCallback((id, updates) => {
    setJournal(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const deleteJournalEntry = useCallback((id) => {
    setJournal(prev => prev.filter(e => e.id !== id))
  }, [])

  // ── Mode toggle ─────────────────────────────────
  const toggleMode = useCallback(() => {
    setMode(m => {
      const next = m === 'demo' ? 'live' : 'demo'
      setSettings(s => ({ ...s, mode: next }))
      return next
    })
  }, [])

  const value = {
    mode, toggleMode,
    holdings, positions, margins,
    trades, journal,
    loading, error,
    settings, setSettings,
    // Derived
    totalCapital, totalDeployed, totalCash, todayPnl, utilization,
    // Actions
    sync, addTrade, updateTrade, deleteTrade,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
  }

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolioContext() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolioContext must be used within PortfolioProvider')
  return ctx
}

export default PortfolioContext
