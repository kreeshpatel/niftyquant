import React, { useState, useMemo } from 'react'
import { usePortfolioContext } from '../../context/PortfolioContext'
import { formatINR } from '../../utils/pnlCalculations'

export default function HoldingsTable() {
  const { holdings } = usePortfolioContext()
  const [sortKey, setSortKey] = useState('pnl')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useState('table') // table | card

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let va = a[sortKey] || 0, vb = b[sortKey] || 0
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
  }, [holdings, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortHeader = ({ field, label, align = 'left' }) => (
    <th onClick={() => handleSort(field)} style={{
      cursor: 'pointer', textAlign: align, userSelect: 'none',
    }}>
      {label} {sortKey === field && (sortDir === 'asc' ? '\u25B2' : '\u25BC')}
    </th>
  )

  if (holdings.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center',
        background: 'var(--bg-widget)', border: '1px solid var(--border-widget)', borderRadius: 'var(--r-md)',
      }}>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 4 }}>No open positions</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Use Pre-Move signals to add paper trades, or connect Zerodha for live holdings.
        </div>
      </div>
    )
  }

  if (view === 'card') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            OPEN POSITIONS ({holdings.length})
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setView('table')} className="btn" style={{ fontSize: 10, padding: '3px 8px' }}>TABLE</button>
            <button onClick={() => setView('card')} className="btn btn-primary" style={{ fontSize: 10, padding: '3px 8px' }}>CARDS</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {sorted.map(h => {
            const isProfit = h.pnl >= 0
            const pnlPct = h.average_price > 0 ? ((h.last_price - h.average_price) / h.average_price * 100) : 0
            return (
              <div key={h.tradingsymbol} className="widget" style={{
                borderLeft: `3px solid ${isProfit ? 'var(--green)' : 'var(--red)'}`,
              }}>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{h.tradingsymbol}</span>
                      <span className={`badge ${isProfit ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 8 }}>
                        {isProfit ? 'PROFIT' : 'LOSS'}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isProfit ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(h.pnl)}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Qty</span> {h.quantity}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Avg</span> {h.average_price.toFixed(1)}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>LTP</span> {h.last_price.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          OPEN POSITIONS ({holdings.length})
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setView('table')} className="btn btn-primary" style={{ fontSize: 10, padding: '3px 8px' }}>TABLE</button>
          <button onClick={() => setView('card')} className="btn" style={{ fontSize: 10, padding: '3px 8px' }}>CARDS</button>
        </div>
      </div>
      <div className="widget" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader field="tradingsymbol" label="Ticker" />
              <SortHeader field="quantity" label="Qty" align="right" />
              <SortHeader field="average_price" label="Avg" align="right" />
              <SortHeader field="last_price" label="LTP" align="right" />
              <th style={{ textAlign: 'right' }}>Value</th>
              <SortHeader field="pnl" label="P&L" align="right" />
              <th style={{ textAlign: 'right' }}>P&L %</th>
              <SortHeader field="day_change_percentage" label="Day" align="right" />
              <th style={{ textAlign: 'center' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const value = h.last_price * h.quantity
              const pnlPct = h.average_price > 0 ? ((h.last_price - h.average_price) / h.average_price * 100) : 0
              const isProfit = h.pnl >= 0
              return (
                <tr key={h.tradingsymbol}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {h.tradingsymbol}
                    {h.sector && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{h.sector}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{h.quantity}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.average_price.toFixed(1)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {h.last_price.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {(value / 100000).toFixed(2)}L
                  </td>
                  <td style={{
                    textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: isProfit ? 'var(--green)' : 'var(--red)',
                  }}>
                    {formatINR(h.pnl)}
                  </td>
                  <td style={{
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    color: isProfit ? 'var(--green)' : 'var(--red)',
                  }}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </td>
                  <td style={{
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    color: (h.day_change_percentage || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {(h.day_change_percentage || 0) >= 0 ? '+' : ''}{(h.day_change_percentage || 0).toFixed(2)}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {h.source === 'premove' ? (
                      <span className="badge badge-amber" style={{ fontSize: 8 }}>PREMOVE</span>
                    ) : h.source === 'manual' ? (
                      <span className="badge badge-blue" style={{ fontSize: 8 }}>MANUAL</span>
                    ) : (
                      <span className="badge badge-purple" style={{ fontSize: 8 }}>ZERODHA</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
