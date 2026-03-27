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
                  padding: '12px 14px', textAlign: col.align || 'left',
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '0.5px solid var(--border-subtle)',
                  cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                }}>
                  {col.label}
                  {sortKey === col.key && <span style={{ color: 'var(--accent-green)', marginLeft: 4 }}>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} style={{ transition: 'background 0.2s var(--ease-out)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {columns.map(col => {
                  const val = row[col.key]
                  const isPnl = col.key === 'return_pct' || col.key === 'net_pnl'
                  const pnlColor = isPnl ? (val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') : undefined
                  const isReason = col.key === 'exit_reason'

                  let content = col.render ? col.render(val, row) : val
                  if (isPnl && typeof val === 'number') {
                    content = <span style={{ color: pnlColor, fontWeight: 600 }}>{val >= 0 ? '+' : ''}{val.toFixed(col.key === 'net_pnl' ? 0 : 1)}{col.key === 'return_pct' ? '%' : ''}</span>
                  }
                  if (isReason && val) {
                    const reasonColors = {
                      stop_loss: { bg: 'var(--red-d)', color: 'var(--accent-red)', border: 'var(--red-b)' },
                      ema_reversal: { bg: 'var(--amber-d)', color: 'var(--accent-orange)', border: 'var(--amber-b)' },
                      target_hit: { bg: 'var(--green-d)', color: 'var(--accent-green)', border: 'var(--green-b)' },
                    }
                    const rc = reasonColors[val] || { bg: 'var(--bg-glass)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)' }
                    content = <span style={{
                      padding: '2px 8px', fontSize: 10, borderRadius: 12,
                      background: rc.bg, color: rc.color, border: `0.5px solid ${rc.border}`,
                      letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 500,
                    }}>{val.replace('_', ' ')}</span>
                  }

                  return (
                    <td key={col.key} style={{
                      padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 13,
                      borderBottom: '0.5px solid rgba(255,255,255,0.04)', textAlign: col.align || 'left',
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
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)', padding: '5px 14px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnStyle}>NEXT</button>
        </div>
      )}
    </div>
  )
}

const btnStyle = {
  padding: '6px 16px', background: 'transparent', border: '0.5px solid var(--border-subtle)',
  borderRadius: 'var(--r-sm)', color: 'var(--text-tertiary)',
  fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
  letterSpacing: '0.05em', fontWeight: 500,
  transition: 'all 0.2s var(--ease-out)',
}
