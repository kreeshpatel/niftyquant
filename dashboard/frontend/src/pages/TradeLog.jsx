import React, { useEffect, useState } from 'react'
import { fetchTrades, fetchTradeStats, getExportURL } from '../api'
import TradeTable from '../components/TradeTable'

const inputStyle = {
  padding: '5px 10px', background: '#ffffff08', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontFamily: 'var(--text-mono)', fontSize: 11, outline: 'none',
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
    })
  }
  useEffect(load, [page, filters])
  useEffect(() => { fetchTradeStats().then(setStats) }, [])

  const columns = [
    { key: 'ticker', label: 'Ticker', render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
    { key: 'entry_date', label: 'Entry' },
    { key: 'exit_date', label: 'Exit' },
    { key: 'entry_price', label: 'Entry Rs', align: 'right', render: v => v?.toFixed(2) },
    { key: 'exit_price', label: 'Exit Rs', align: 'right', render: v => v?.toFixed(2) },
    { key: 'return_pct', label: 'P&L %', align: 'right' },
    { key: 'hold_days', label: 'Days', align: 'right' },
    { key: 'exit_reason', label: 'Reason', align: 'right' },
  ]

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--text-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>Trade history</h1>
        <span style={{
          fontFamily: 'var(--text-mono)', fontSize: 10, padding: '4px 12px', borderRadius: 20,
          background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple-border)',
        }}>{total}</span>
      </div>

      <div style={{
        fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 12,
      }}>
        {total} trades · {stats.win_rate || 0}% win rate · +{stats.avg_win || 0}% avg win · {stats.avg_loss || 0}% avg loss
      </div>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', marginBottom: 12, flexWrap: 'wrap',
      }}>
        <input placeholder="TICKER" value={filters.ticker}
          onChange={e => { setFilters({ ...filters, ticker: e.target.value }); setPage(1) }}
          style={{ ...inputStyle, width: 100 }} />
        <input type="date" value={filters.start}
          onChange={e => { setFilters({ ...filters, start: e.target.value }); setPage(1) }}
          style={inputStyle} />
        <span style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)' }}>TO</span>
        <input type="date" value={filters.end}
          onChange={e => { setFilters({ ...filters, end: e.target.value }); setPage(1) }}
          style={inputStyle} />
        <select value={filters.exit_reason}
          onChange={e => { setFilters({ ...filters, exit_reason: e.target.value }); setPage(1) }}
          style={inputStyle}>
          <option value="">ALL REASONS</option>
          <option value="stop_loss">STOP LOSS</option>
          <option value="ema_reversal">EMA REVERSAL</option>
          <option value="target_hit">TARGET HIT</option>
        </select>
        <a href={getExportURL()} download="trade_log.csv" style={{
          marginLeft: 'auto', padding: '5px 14px', fontSize: 10, letterSpacing: 1,
          color: 'var(--purple)', border: '1px solid var(--purple-border)',
          borderRadius: 'var(--radius-sm)', textDecoration: 'none', textTransform: 'uppercase',
          fontFamily: 'var(--text-mono)',
        }}>EXPORT CSV</a>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <TradeTable columns={columns} rows={trades} />
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={inputStyle}>PREV</button>
          <span style={{ padding: '5px 14px', fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            PAGE {page} / {pages}
          </span>
          <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages} style={inputStyle}>NEXT</button>
        </div>
      )}
    </div>
  )
}
