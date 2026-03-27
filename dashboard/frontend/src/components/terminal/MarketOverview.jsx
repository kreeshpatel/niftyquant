import React from 'react'
import { useNSEData } from '../../hooks/useNSEData'

export default function MarketOverview() {
  const { breadth, marketStatus } = useNSEData()
  const total = breadth.advances + breadth.declines + breadth.unchanged
  const advPct = total > 0 ? (breadth.advances / total * 100) : 50
  const decPct = total > 0 ? (breadth.declines / total * 100) : 50

  // Determine regime from breadth
  const regime = advPct > 55 ? 'BULL' : decPct > 55 ? 'BEAR' : 'CHOPPY'
  const regimeColor = regime === 'BULL' ? 'var(--green)' : regime === 'BEAR' ? 'var(--red)' : 'var(--amber)'

  return (
    <div className="widget">
      <div className="widget-header">
        <span>Market Overview</span>
        <span style={{ color: marketStatus.color, fontSize: 10 }}>{marketStatus.label}</span>
      </div>
      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Regime */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 4,
            background: regime === 'BULL' ? 'var(--green-d)' : regime === 'BEAR' ? 'var(--red-d)' : 'var(--amber-d)',
            border: `1px solid ${regime === 'BULL' ? 'var(--green-b)' : regime === 'BEAR' ? 'var(--red-b)' : 'var(--amber-b)'}`,
            fontSize: 11, fontWeight: 700, color: regimeColor, letterSpacing: '0.08em',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: regimeColor,
              animation: regime !== 'BULL' ? 'pulse 2s infinite' : 'none',
            }} />
            {regime}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Market Regime</span>
        </div>

        {/* Breadth bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: 'var(--green)' }}>Advances {breadth.advances}</span>
            <span style={{ color: 'var(--red)' }}>Declines {breadth.declines}</span>
          </div>
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
            <div style={{ width: `${advPct}%`, background: 'var(--green)', transition: 'width 0.5s' }} />
            <div style={{ width: `${100 - advPct - decPct}%`, background: 'var(--text-muted)' }} />
            <div style={{ width: `${decPct}%`, background: 'var(--red)', transition: 'width 0.5s' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {breadth.unchanged} unchanged
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>ADV/DEC RATIO</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: advPct > decPct ? 'var(--green)' : 'var(--red)' }}>
              {(breadth.advances / Math.max(1, breadth.declines)).toFixed(2)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>BREADTH</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: advPct > 50 ? 'var(--green)' : 'var(--red)' }}>
              {advPct.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
