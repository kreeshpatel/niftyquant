import React from 'react'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function cellColor(ret) {
  if (ret == null) return '#ffffff05'
  if (ret > 5) return '#34d399cc'
  if (ret > 2) return '#34d39980'
  if (ret > 0) return '#34d39940'
  if (ret > -2) return '#f8717140'
  if (ret > -5) return '#f8717180'
  return '#f87171cc'
}

function textColor(ret) {
  if (ret == null) return 'var(--text-dim)'
  return Math.abs(ret) > 3 ? '#fff' : 'var(--text-dim)'
}

export default function MonthlyHeatmap({ data = [] }) {
  if (data.length === 0) return null

  const years = [...new Set(data.map(d => d.year))].sort()

  // Annual totals
  const annualTotals = {}
  years.forEach(y => {
    const monthsInYear = data.filter(d => d.year === y)
    // Compound monthly returns
    let cumulative = 1
    monthsInYear.forEach(m => { cumulative *= (1 + m.return_pct / 100) })
    annualTotals[y] = Math.round((cumulative - 1) * 10000) / 100
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, paddingLeft: 40 }}>
        {MONTH_LABELS.map(m => (
          <div key={m} style={{
            flex: 1, textAlign: 'center', fontFamily: 'var(--text-mono)',
            fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5,
          }}>{m}</div>
        ))}
        <div style={{ width: 52, textAlign: 'center', fontFamily: 'var(--text-mono)', fontSize: 9, color: 'var(--text-dim)' }}>Year</div>
      </div>

      {years.map(year => {
        const annual = annualTotals[year]
        return (
          <div key={year} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <div style={{ width: 36, fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'right', paddingRight: 4 }}>{year}</div>
            {Array.from({ length: 12 }, (_, i) => {
              const entry = data.find(d => d.year === year && d.month === i + 1)
              const ret = entry?.return_pct
              return (
                <div key={i} title={ret != null ? `${MONTH_LABELS[i]} ${year}: ${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : 'No data'} style={{
                  flex: 1, height: 36, borderRadius: 6,
                  background: cellColor(ret),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--text-mono)', fontSize: 9, color: textColor(ret),
                  cursor: 'default', transition: 'transform 0.1s',
                }}>
                  {ret != null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}` : ''}
                </div>
              )
            })}
            <div style={{
              width: 52, textAlign: 'center', fontFamily: 'var(--text-mono)', fontSize: 11, fontWeight: 700,
              color: annual >= 0 ? 'var(--green)' : 'var(--red)',
            }}>{annual >= 0 ? '+' : ''}{annual.toFixed(1)}%</div>
          </div>
        )
      })}
    </div>
  )
}
