import React from 'react'

export default function RegimeCard({ label, value, max = 100, color = 'var(--purple)' }) {
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
        fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 500, color, marginBottom: 8,
      }}>{typeof value === 'number' ? value.toFixed(1) : value}</div>
      <div style={{ height: 2, background: '#ffffff08', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color, borderRadius: 1,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}
