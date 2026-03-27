import React from 'react'
import { useNSEData } from '../../hooks/useNSEData'

export default function IndexBar() {
  const { indices, loading } = useNSEData()

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, flex: 1, borderRadius: 'var(--r-md)' }} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
      {indices.map(idx => {
        const isUp = idx.change >= 0
        const isVix = idx.name === 'INDIA VIX'
        return (
          <div key={idx.name} style={{
            flex: '1 1 0', minWidth: 150,
            background: 'var(--bg-widget)',
            border: '1px solid var(--border-widget)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              color: 'var(--text-tertiary)', marginBottom: 4,
              textTransform: 'uppercase',
            }}>{idx.name.replace('NIFTY ', '')}</div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            }}>{idx.value.toLocaleString('en-IN', { maximumFractionDigits: idx.value < 100 ? 2 : 0 })}</div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: isVix ? (idx.change > 5 ? 'var(--red)' : idx.change > 0 ? 'var(--amber)' : 'var(--green)') : (isUp ? 'var(--green)' : 'var(--red)'),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isUp ? '+' : ''}{idx.changeAbs.toFixed(idx.value < 100 ? 2 : 0)} ({isUp ? '+' : ''}{idx.change.toFixed(2)}%)
            </div>
          </div>
        )
      })}
    </div>
  )
}
