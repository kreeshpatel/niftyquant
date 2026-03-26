import React, { useState } from 'react'

export default function TradeTable({ columns = [], rows = [], pageSize = 50 }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey], bv = b[sortKey]
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{
                  padding: '10px 14px', textAlign: col.align || 'left',
                  fontFamily: 'var(--text-mono)', fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: 1.5, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                }}>
                  {col.label}
                  {sortKey === col.key && <span style={{ color: 'var(--purple)', marginLeft: 4 }}>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff03'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {columns.map(col => {
                  const val = row[col.key]
                  const isPnl = col.key === 'return_pct' || col.key === 'net_pnl'
                  const pnlColor = isPnl ? (val >= 0 ? 'var(--green)' : 'var(--red)') : undefined
                  const isReason = col.key === 'exit_reason'

                  let content = col.render ? col.render(val, row) : val
                  if (isPnl && typeof val === 'number') {
                    content = <span style={{ color: pnlColor, fontWeight: 700 }}>{val >= 0 ? '+' : ''}{val.toFixed(col.key === 'net_pnl' ? 0 : 1)}{col.key === 'return_pct' ? '%' : ''}</span>
                  }
                  if (isReason && val) {
                    const reasonColors = {
                      stop_loss: { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red-border)' },
                      ema_reversal: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)' },
                      target_hit: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' },
                    }
                    const rc = reasonColors[val] || { bg: 'var(--bg-card)', color: 'var(--text-dim)', border: 'var(--border)' }
                    content = <span style={{
                      padding: '2px 8px', fontSize: 9, borderRadius: 12,
                      background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>{val.replace('_', ' ')}</span>
                  }

                  return (
                    <td key={col.key} style={{
                      padding: '12px 14px', fontFamily: 'var(--text-mono)', fontSize: 12,
                      borderBottom: '1px solid #ffffff05', textAlign: col.align || 'left',
                      borderLeft: isPnl && typeof val === 'number' ? `2px solid ${val >= 0 ? 'var(--green-bg)' : 'var(--red-bg)'}` : undefined,
                      whiteSpace: 'nowrap',
                    }}>{content}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btnStyle}>PREV</button>
          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '5px 14px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnStyle}>NEXT</button>
        </div>
      )}
    </div>
  )
}

const btnStyle = {
  padding: '5px 16px', background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)',
  fontFamily: 'var(--text-mono)', fontSize: 10, cursor: 'pointer',
  letterSpacing: 1,
}
