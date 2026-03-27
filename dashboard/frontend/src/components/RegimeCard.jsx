import React from 'react'

function autoColor(label, value) {
  const l = (label || '').toLowerCase()
  if (l.includes('vix')) return value < 15 ? 'var(--accent-green)' : value <= 20 ? 'var(--accent-orange)' : 'var(--accent-red)'
  if (l.includes('breadth')) return value > 60 ? 'var(--accent-green)' : value >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'
  if (l.includes('rsi')) return value > 60 ? 'var(--accent-green)' : value >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'
  if (l.includes('adx')) return value > 30 ? 'var(--accent-green)' : value >= 20 ? 'var(--accent-orange)' : 'var(--accent-red)'
  return 'var(--accent-purple)'
}

export default function RegimeCard({ label, value, max = 100, color }) {
  const resolvedColor = color || autoColor(label, value)
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{
      borderRadius: 16, padding: '16px 18px',
      background: 'var(--bg-card)', border: '0.5px solid var(--border-subtle)',
      boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.2)',
      transition: 'border-color 0.2s var(--ease-out), transform 0.1s var(--ease-out)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8,
      }}>{label}</div>
      <div className="tabular" style={{
        fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: resolvedColor, marginBottom: 10,
        letterSpacing: '-0.02em',
      }}>{typeof value === 'number' ? value.toFixed(1) : value}</div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: resolvedColor, borderRadius: 1,
          transition: 'width 0.5s var(--ease-out)',
        }} />
      </div>
    </div>
  )
}
