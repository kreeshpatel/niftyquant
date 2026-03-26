import React from 'react'

function autoColor(label, value) {
  const l = (label || '').toLowerCase()
  if (l.includes('vix')) return value < 15 ? 'var(--green)' : value <= 20 ? 'var(--amber)' : 'var(--red)'
  if (l.includes('breadth')) return value > 60 ? 'var(--green)' : value >= 40 ? 'var(--amber)' : 'var(--red)'
  if (l.includes('rsi')) return value > 60 ? 'var(--green)' : value >= 40 ? 'var(--amber)' : 'var(--red)'
  if (l.includes('adx')) return value > 30 ? 'var(--green)' : value >= 20 ? 'var(--amber)' : 'var(--red)'
  return 'var(--purple)'
}

export default function RegimeCard({ label, value, max = 100, color }) {
  const resolvedColor = color || autoColor(label, value)
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{
      borderRadius: 'var(--radius-md)', padding: '14px 16px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'var(--text-mono)', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 500, color: resolvedColor, marginBottom: 8,
      }}>{typeof value === 'number' ? value.toFixed(1) : value}</div>
      <div style={{ height: 2, background: '#ffffff08', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: resolvedColor, borderRadius: 1,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}
