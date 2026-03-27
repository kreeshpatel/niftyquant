import React, { useState } from 'react'
import SignalBreakdown from './SignalBreakdown'

export default function PreMoveCard({ detection }) {
  const [expanded, setExpanded] = useState(false)
  const d = detection
  const strengthColor = d.strength === 'STRONG' ? 'var(--green)' : d.strength === 'MODERATE' ? 'var(--amber)' : 'var(--text-tertiary)'
  const dirColor = d.direction === 'BULLISH' ? 'var(--green)' : d.direction === 'BEARISH' ? 'var(--red)' : 'var(--text-tertiary)'

  return (
    <div className="widget" style={{
      borderLeft: `3px solid ${strengthColor}`,
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    }} onClick={() => setExpanded(e => !e)}>
      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{d.ticker}</span>
            <span className={`badge ${d.strength === 'STRONG' ? 'badge-green' : d.strength === 'MODERATE' ? 'badge-amber' : 'badge-purple'}`}>
              {d.strength}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: dirColor }}>
              {d.direction === 'BULLISH' ? '\u25B2' : d.direction === 'BEARISH' ? '\u25BC' : '\u25C6'} {d.direction}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
            {(d.composite * 100).toFixed(0)}%
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          <span>{d.sector}</span>
          <span>\u20B9{d.price?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
          <span style={{ color: (d.dayChange || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {(d.dayChange || 0) >= 0 ? '+' : ''}{(d.dayChange || 0).toFixed(2)}%
          </span>
          <span>RSI {d.rsi?.toFixed(0)}</span>
          <span>ADX {d.adx?.toFixed(0)}</span>
          <span>Vol {d.volumeRatio?.toFixed(1)}x</span>
        </div>

        {/* Signal strength bars */}
        <div style={{ display: 'flex', gap: 4, marginBottom: expanded ? 12 : 0 }}>
          {Object.entries(d.signals).map(([key, value]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{
                height: 4, borderRadius: 2, background: 'var(--bg-elevated)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${value * 100}%`,
                  background: value > 0.6 ? 'var(--green)' : value > 0.3 ? 'var(--amber)' : 'var(--text-muted)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Expanded breakdown */}
        {expanded && <SignalBreakdown signals={d.signals} />}
      </div>
    </div>
  )
}
