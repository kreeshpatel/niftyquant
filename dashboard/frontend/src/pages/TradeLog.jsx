import React, { useEffect, useState } from 'react'
import { fetchTrades, fetchTradeStats, EXPORT_URL } from '../api'
import { T, pnlColor } from '../theme'
import TerminalTable from '../components/TerminalTable'

const inputStyle = {
  padding: '5px 10px', background: T.bgBase, border: `1px solid ${T.bgLine}`,
  color: T.textPrimary, fontSize: 11, outline: 'none',
}

export default function TradeLog() {
  const [trades, setTrades] = useState([])
  const [stats, setStats] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [filters, setFilters] = useState({ ticker: '', start: '', end: '', exit_reason: '' })

  const load = () => {
    fetchTrades({ page, per_page: 50, ...filters }).then(d => {
      setTrades(d.trades || []); setTotal(d.total || 0); setPages(d.pages || 0)
    }).catch(() => {})
  }
  useEffect(load, [page, filters])
  useEffect(() => { fetchTradeStats().then(setStats).catch(() => {}) }, [])

  const columns = [
    { key: 'ticker', label: 'Ticker', render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
    { key: 'entry_date', label: 'Entry', style: () => ({ fontSize: 11 }) },
    { key: 'exit_date', label: 'Exit', style: () => ({ fontSize: 11 }) },
    { key: 'entry_price', label: 'Entry Rs', align: 'right', render: v => v?.toFixed?.(2) ?? v },
    { key: 'exit_price', label: 'Exit Rs', align: 'right', render: v => v?.toFixed?.(2) ?? v },
    { key: 'return_pct', label: 'P&L %', align: 'right',
      render: v => <span style={{ color: pnlColor(v), fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v?.toFixed?.(1) ?? v}%</span>,
      style: (row) => ({ borderLeft: `3px solid ${pnlColor(row.return_pct || 0)}` }) },
    { key: 'hold_days', label: 'Days', align: 'right' },
    { key: 'exit_reason', label: 'Reason', align: 'right',
      render: v => {
        const bg = v === 'stop_loss' ? T.dimRed : T.dimAmber
        const color = v === 'stop_loss' ? T.red : T.amber
        return <span style={{ padding: '1px 6px', background: bg, color, fontSize: 10, letterSpacing: 0.5 }}>{v?.toUpperCase()}</span>
      }},
  ]

  return (
    <div>
      {/* Stats bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, marginBottom: 1,
        border: `1px solid ${T.bgLine}`, background: T.bgPanel,
      }}>
        {[
          `SHOWING ${total} TRADES`,
          `WIN RATE: ${stats.win_rate || 0}%`,
          `BEST: +${stats.best_trade || 0}%`,
          `WORST: ${stats.worst_trade || 0}%`,
        ].map((s, i) => (
          <span key={i} style={{
            padding: '8px 14px', fontSize: 10, color: T.textDim, letterSpacing: 1,
            borderRight: `1px solid ${T.bgLine}`, textTransform: 'uppercase',
          }}>{s}</span>
        ))}
        <a href={EXPORT_URL} target="_blank" rel="noreferrer" style={{
          marginLeft: 'auto', padding: '5px 14px', fontSize: 10, letterSpacing: 1.5,
          color: T.amber, border: `1px solid ${T.amber}30`, textTransform: 'uppercase',
        }}>EXPORT CSV</a>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px',
        background: T.bgPanel, border: `1px solid ${T.bgLine}`, marginBottom: 1,
      }}>
        <input placeholder="TICKER" value={filters.ticker}
          onChange={e => { setFilters({ ...filters, ticker: e.target.value }); setPage(1) }}
          style={{ ...inputStyle, width: 100 }} />
        <input type="date" value={filters.start}
          onChange={e => { setFilters({ ...filters, start: e.target.value }); setPage(1) }}
          style={inputStyle} />
        <span style={{ color: T.textDim, fontSize: 10 }}>TO</span>
        <input type="date" value={filters.end}
          onChange={e => { setFilters({ ...filters, end: e.target.value }); setPage(1) }}
          style={inputStyle} />
        <select value={filters.exit_reason}
          onChange={e => { setFilters({ ...filters, exit_reason: e.target.value }); setPage(1) }}
          style={inputStyle}>
          <option value="">ALL REASONS</option>
          <option value="stop_loss">STOP LOSS</option>
          <option value="ema_reversal">EMA REVERSAL</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${T.bgLine}` }}>
        <TerminalTable columns={columns} rows={trades} />
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            style={{ ...inputStyle, cursor: 'pointer', color: T.textMuted }}>PREV</button>
          <span style={{ padding: '5px 14px', fontSize: 11, color: T.textDim }}>
            PAGE {page} / {pages}
          </span>
          <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
            style={{ ...inputStyle, cursor: 'pointer', color: T.textMuted }}>NEXT</button>
        </div>
      )}
    </div>
  )
}
