import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import * as zerodha from '../utils/zerodhaApi'
import { getSector } from '../data/sectorMap'
import stockData from '../data/stockData.json'

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

  const addPreMoveTrade = useCallback((detection) => {
    const id = crypto.randomUUID()
    const newTrade = {
      id,
      ticker: detection.ticker,
      side: 'LONG',
      quantity: Math.max(1, Math.floor(50000 / (detection.price || 500))),
      entry_price: detection.price,
      entry_date: new Date().toISOString().split('T')[0],
      exit_price: null,
      exit_date: null,
      stop_loss: detection.price * 0.95,
      target: detection.price * 1.05,
      strategy: 'Pre-Move',
      source: 'premove',
      tags: ['PREMOVE_ENTRY', detection.strength?.toLowerCase(), detection.hint?.replace(/\s+/g, '-')].filter(Boolean),
      premove_data: {
        composite: detection.composite,
        strength: detection.strength,
        hint: detection.hint,
        regime: detection.regime,
        signals: detection.signals,
      },
      sector: getSector(detection.ticker),
      pnl: 0,
      pnl_pct: 0,
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

  // ── Auto-update open trade prices from stockData ──
  const updatePricesFromStockData = useCallback(() => {
    setTrades(prev => prev.map(t => {
      if (t.exit_price) return t // already closed
      const sd = stockData[t.ticker]
      if (!sd || !sd.close) return t

      const ltp = sd.close
      const pnl = (ltp - t.entry_price) * t.quantity * (t.side === 'SHORT' ? -1 : 1)
      const pnl_pct = ((ltp - t.entry_price) / t.entry_price) * 100 * (t.side === 'SHORT' ? -1 : 1)
      const daysHeld = t.entry_date ? Math.ceil((Date.now() - new Date(t.entry_date).getTime()) / 86400000) : 0

      // Check stop loss / target
      let autoClose = null
      if (t.stop_loss && ltp <= t.stop_loss) autoClose = { exit_price: t.stop_loss, exit_reason: 'stop_loss' }
      if (t.target && ltp >= t.target) autoClose = { exit_price: t.target, exit_reason: 'target_hit' }

      if (autoClose) {
        const exitPnl = (autoClose.exit_price - t.entry_price) * t.quantity * (t.side === 'SHORT' ? -1 : 1)
        const exitPnlPct = ((autoClose.exit_price - t.entry_price) / t.entry_price) * 100 * (t.side === 'SHORT' ? -1 : 1)
        return { ...t, ...autoClose, exit_date: new Date().toISOString().split('T')[0], pnl: exitPnl, pnl_pct: exitPnlPct, last_price: ltp }
      }

      return { ...t, last_price: ltp, unrealized_pnl: pnl, unrealized_pnl_pct: pnl_pct, days_held: daysHeld }
    }))
  }, [])

  // Update prices on mount and when stockData changes (after refresh)
  useEffect(() => { updatePricesFromStockData() }, [updatePricesFromStockData])

  // ── Pre-Move derived stats with performance tracking ──
  const preMoveStats = useMemo(() => {
    const preMoveTrades = trades.filter(t => t.source === 'premove')
    const open = preMoveTrades.filter(t => !t.exit_price)
    const closed = preMoveTrades.filter(t => t.exit_price)
    const wins = closed.filter(t => t.pnl > 0)

    // Performance vs backtest expectation (59.1% hit 3.39% target)
    const TARGET_PCT = 3.39
    const BACKTEST_ACCURACY = 59.1
    const hitTarget = closed.filter(t => Math.abs(t.pnl_pct || 0) >= TARGET_PCT)

    // Track max move during holding for open trades
    const openWithMaxMove = open.map(t => {
      const sd = stockData[t.ticker]
      if (!sd || !t.entry_price) return t
      const movePct = ((sd.close - t.entry_price) / t.entry_price) * 100
      return { ...t, currentMove: movePct }
    })

    return {
      total: preMoveTrades.length,
      open: open.length,
      closed: closed.length,
      winRate: closed.length > 0 ? Math.round(wins.length / closed.length * 1000) / 10 : 0,
      totalPnl: closed.reduce((s, t) => s + (t.pnl || 0), 0),
      avgReturn: closed.length > 0 ? Math.round(closed.reduce((s, t) => s + (t.pnl_pct || 0), 0) / closed.length * 10) / 10 : 0,
      // Performance vs backtest
      targetHits: hitTarget.length,
      targetHitRate: closed.length > 0 ? Math.round(hitTarget.length / closed.length * 1000) / 10 : 0,
      backtestExpected: BACKTEST_ACCURACY,
      targetPct: TARGET_PCT,
      openTrades: openWithMaxMove,
    }
  }, [trades])

  const value = {
    mode, toggleMode,
    holdings, positions, margins,
    trades, journal,
    loading, error,
    settings, setSettings,
    // Derived
    totalCapital, totalDeployed, totalCash, todayPnl, utilization,
    preMoveStats,
    // Actions
    sync, addTrade, addPreMoveTrade, updateTrade, deleteTrade,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
    updatePricesFromStockData,
  }

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolioContext() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolioContext must be used within PortfolioProvider')
  return ctx
}

export default PortfolioContext
