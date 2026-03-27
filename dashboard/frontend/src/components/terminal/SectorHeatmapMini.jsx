import React from 'react'
import { useNSEData } from '../../hooks/useNSEData'

export default function SectorHeatmapMini() {
  const { sectors } = useNSEData()

  const maxAbs = Math.max(1, ...sectors.map(s => Math.abs(s.change)))

  function getColor(change) {
    if (change >= 2) return 'var(--green)'
    if (change >= 1) return '#059669'
    if (change >= 0.3) return '#065f46'
    if (change > -0.3) return 'var(--text-muted)'
    if (change > -1) return '#7f1d1d'
    if (change > -2) return '#b91c1c'
    return 'var(--red)'
  }

  function getBg(change) {
    const intensity = Math.min(0.25, Math.abs(change) / maxAbs * 0.25)
    return change >= 0 ? `rgba(16,185,129,${intensity})` : `rgba(239,68,68,${intensity})`
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <span>Sector Performance</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 400 }}>Today</span>
      </div>
      <div className="widget-body" style={{ padding: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 4 }}>
          {sectors.map(s => (
            <div key={s.name} style={{
              background: getBg(s.change),
              border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: '8px 6px', textAlign: 'center',
              transition: 'transform 0.1s',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2, letterSpacing: '0.04em' }}>
                {s.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: getColor(s.change), fontVariantNumeric: 'tabular-nums' }}>
                {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
