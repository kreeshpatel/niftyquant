import React, { useState } from 'react'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function cellColor(ret) {
  if (ret == null) return '#ffffff05'
  if (ret > 8) return 'rgba(52,211,153,1)'
  if (ret > 5) return 'rgba(52,211,153,0.75)'
  if (ret > 2) return 'rgba(52,211,153,0.50)'
  if (ret > 0) return 'rgba(52,211,153,0.25)'
  if (ret > -2) return 'rgba(248,113,113,0.25)'
  if (ret > -5) return 'rgba(248,113,113,0.50)'
  if (ret > -8) return 'rgba(248,113,113,0.75)'
  return 'rgba(248,113,113,1)'
}

function textColor(ret) {
  if (ret == null) return 'var(--text-dim)'
  if (Math.abs(ret) > 5) return '#fff'
  if (Math.abs(ret) > 2) return 'rgba(255,255,255,0.85)'
  return 'rgba(255,255,255,0.5)'
}

export default function MonthlyHeatmap({ data = [] }) {
  const [hovered, setHovered] = useState(null)

  if (data.length === 0) return null

  const years = [...new Set(data.map(d => d.year))].sort()

  const annualTotals = {}
  years.forEach(y => {
    const monthsInYear = data.filter(d => d.year === y)
    let cumulative = 1
    monthsInYear.forEach(m => { cumulative *= (1 + m.return_pct / 100) })
    annualTotals[y] = Math.round((cumulative - 1) * 10000) / 100
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 620 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, paddingLeft: 44 }}>
          {MONTH_LABELS.map(m => (
            <div key={m} style={{
              flex: 1, minWidth: 52, textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 9,
              color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>{m}</div>
          ))}
          <div style={{
            width: 60, textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 9,
            color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>Year</div>
        </div>

        {/* Rows */}
        {years.map(year => {
          const annual = annualTotals[year]
          return (
            <div key={year} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <div style={{
                width: 44, fontFamily: 'var(--mono)', fontSize: 11,
                color: 'rgba(255,255,255,0.35)', textAlign: 'right', paddingRight: 4,
              }}>{year}</div>

              {Array.from({ length: 12 }, (_, i) => {
                const entry = data.find(d => d.year === year && d.month === i + 1)
                const ret = entry?.return_pct
                const key = `${year}-${i}`
                const isHovered = hovered === key

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      flex: 1, minWidth: 52, height: 40, borderRadius: 6,
                      background: cellColor(ret),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--mono)', fontSize: 11, color: textColor(ret),
                      cursor: 'default',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                      position: 'relative',
                    }}
                  >
                    {ret != null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}` : ''}
                    {isHovered && ret != null && (
                      <div style={{
                        position: 'absolute', bottom: '110%', left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#111114', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap',
                        fontFamily: 'var(--mono)', fontSize: 10, color: '#e8e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 20,
                        pointerEvents: 'none',
                      }}>
                        {MONTH_LABELS[i]} {year}: {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )
              })}

              <div style={{
                width: 60, textAlign: 'center',
                fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                color: annual >= 0 ? 'var(--green)' : 'var(--red)',
              }}>{annual >= 0 ? '+' : ''}{annual.toFixed(1)}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
