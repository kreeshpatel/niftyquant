import React from 'react'

export default function MetricHero({ label, value, sub, color = 'var(--purple)', glowColor = '#818cf8' }) {
  return (
    <div style={{
      padding: '32px 32px 28px', borderRight: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden', flex: 1, minWidth: 0,
      transition: 'background 0.3s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Ambient circle */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', background: `${glowColor}12`, pointerEvents: 'none',
      }} />
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
        letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)',
        marginBottom: 12, position: 'relative',
      }}>{label}</div>
      <div className="tabular" style={{
        fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 500,
        lineHeight: 1, letterSpacing: -2, color, position: 'relative',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && <div className="tabular" style={{
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)',
        marginTop: 8, position: 'relative',
      }}>{sub}</div>}
    </div>
  )
}
