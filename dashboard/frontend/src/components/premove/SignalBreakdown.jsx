import React from 'react'
import { WEIGHTS } from '../../utils/preMove'

const SIGNAL_LABELS = {
  volumeAccumulation: { label: 'Volume Accumulation', desc: 'Unusual volume without price move', icon: '\u25A0' },
  volatilitySqueeze: { label: 'Volatility Squeeze', desc: 'Bollinger Band compression', icon: '\u25C8' },
  momentumDivergence: { label: 'Momentum Divergence', desc: 'RSI/MACD shifting while price flat', icon: '\u25B2' },
  institutionalFootprint: { label: 'Institutional Footprint', desc: 'High delivery % / block trades', icon: '\u25CF' },
  sectorRotation: { label: 'Sector Rotation', desc: 'Money flowing into sector', icon: '\u21BB' },
}

export default function SignalBreakdown({ signals }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        SIGNAL BREAKDOWN
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(signals).map(([key, value]) => {
          const info = SIGNAL_LABELS[key] || { label: key, desc: '', icon: '-' }
          const weight = WEIGHTS[key] || 0
          const weighted = value * weight
          const color = value > 0.6 ? 'var(--green)' : value > 0.3 ? 'var(--amber)' : 'var(--text-muted)'

          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color }}>{info.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{info.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({(weight * 100).toFixed(0)}%w)</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color }}>{(value * 100).toFixed(0)}%</span>
                  <span style={{ color: 'var(--text-muted)' }}>\u2192 {(weighted * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${value * 100}%`, borderRadius: 2,
                  background: color,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{info.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
