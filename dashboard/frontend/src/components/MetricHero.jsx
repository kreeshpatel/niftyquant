import React from 'react'

export default function MetricHero({ label, value, sub, color = 'var(--purple)', glowColor = '#a78bfa' }) {
  return (
    <div style={{
      padding: '28px 28px 24px', borderRight: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden', flex: 1, minWidth: 0,
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', background: `${glowColor}14`, pointerEvents: 'none',
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)',
        marginBottom: 12, position: 'relative',
      }}>{label}</div>
      <div className="tabular" style={{
        fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 500,
        lineHeight: 1, letterSpacing: -2, color, position: 'relative',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && <div className="tabular" style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
        marginTop: 8, position: 'relative',
      }}>{sub}</div>}
    </div>
  )
}
