import React, { useState } from 'react'

export default function SignalCard({ signal = {} }) {
  const [hover, setHover] = useState(false)
  const s = signal
  const isHigh = s.conviction === 'HIGH'
  const gradientBar = isHigh
    ? 'linear-gradient(90deg, #34d399, #10b981)'
    : 'linear-gradient(90deg, #fbbf24, #f59e0b)'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--radius-lg)', padding: '20px 22px',
        background: 'var(--bg-card)', border: `1px solid ${hover ? 'var(--border-hover)' : 'var(--border)'}`,
        cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
        transform: hover ? 'translateY(-1px)' : 'none', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: gradientBar,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 4 }}>
        <div style={{ fontFamily: 'var(--text-display)', fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>
          {s.ticker || '--'}
        </div>
        <span style={{
          fontFamily: 'var(--text-mono)', fontSize: 9, padding: '5px 12px', borderRadius: 20,
          letterSpacing: 1,
          background: isHigh ? 'var(--green-bg)' : 'var(--amber-bg)',
          color: isHigh ? 'var(--green)' : 'var(--amber)',
          border: `1px solid ${isHigh ? 'var(--green-border)' : 'var(--amber-border)'}`,
        }}>{s.conviction || 'MEDIUM'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          ['ENTRY', s.entry, 'var(--amber)'],
          ['STOP', s.stop, 'var(--red)'],
          ['TARGET', s.target, 'var(--green)'],
        ].map(([label, val, color]) => (
          <div key={label}>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 16, fontWeight: 500, color }}>{val ? `${Number(val).toLocaleString('en-IN')}` : '--'}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.8 }}>
        {s.dip_reason || ''} {s.hold_days ? ` · ~${s.hold_days}d hold` : ''}
      </div>

      {hover && s.rr != null && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          background: '#111113', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          padding: '10px 14px', fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-secondary)',
          whiteSpace: 'nowrap', zIndex: 10,
        }}>
          R:R {s.rr}:1 · ML {s.ml_score || '--'} · Size {s.size_multiplier || '1.0'}x
        </div>
      )}
    </div>
  )
}
