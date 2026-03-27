import React, { useState, useMemo } from 'react'
import { usePreMoveDetection } from '../hooks/usePreMoveDetection'
import { detectRegime } from '../utils/preMove'
import PreMoveCard from '../components/premove/PreMoveCard'
import PreMoveScanner from '../components/premove/PreMoveScanner'
import HistoricalAccuracy from '../components/premove/HistoricalAccuracy'

function RegimeBanner({ regime }) {
  if (!regime) return null
  const color = regime.regime === 'BULLISH' ? 'var(--green)' : regime.regime === 'BEARISH' ? 'var(--red)' : 'var(--amber)'
  const bgColor = regime.regime === 'BULLISH' ? 'var(--green-d)' : regime.regime === 'BEARISH' ? 'var(--red-d)' : 'var(--amber-d)'
  const borderColor = regime.regime === 'BULLISH' ? 'var(--green-b)' : regime.regime === 'BEARISH' ? 'var(--red-b)' : 'var(--amber-b)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', marginBottom: 12, borderRadius: 'var(--r-md)',
      background: bgColor, border: `1px solid ${borderColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          animation: regime.regime !== 'NEUTRAL' ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.05em' }}>
          {regime.regime} REGIME
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          Avg: {regime.avgDayChange >= 0 ? '+' : ''}{regime.avgDayChange}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          (directional hint for volatility alerts)
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-tertiary)' }}>
        <span><span style={{ color: 'var(--green)' }}>{regime.pctPositive}%</span> up</span>
        <span><span style={{ color: 'var(--red)' }}>{regime.pctNegative}%</span> down</span>
      </div>
    </div>
  )
}

export default function PreMove() {
  const { detections, accuracy, scanning, lastScan, strongSignals, moderateSignals, backtesting, scan } = usePreMoveDetection()
  const [filter, setFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')

  const regime = useMemo(() => detectRegime(), [])

  const sectors = useMemo(() => {
    const set = new Set(detections.map(d => d.sector))
    return ['all', ...Array.from(set).sort()]
  }, [detections])

  const filtered = useMemo(() => {
    return detections.filter(d => {
      if (filter !== 'all' && d.strength !== filter) return false
      if (sectorFilter !== 'all' && d.sector !== sectorFilter) return false
      return true
    })
  }, [detections, filter, sectorFilter])

  const filterBtn = (value, current, setter, label, color) => (
    <button onClick={() => setter(value)} style={{
      padding: '4px 12px', borderRadius: 4, border: '1px solid',
      borderColor: current === value ? color || 'var(--green-b)' : 'var(--border-widget)',
      background: current === value ? (color ? `${color}20` : 'var(--green-d)') : 'var(--bg-widget)',
      color: current === value ? (color || 'var(--green)') : 'var(--text-tertiary)',
      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--mono)',
      transition: 'all 0.15s',
    }}>{label}</button>
  )

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Pre-Move Detection Engine</h1>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.08em',
            padding: '2px 8px', background: 'var(--amber-d)', borderRadius: 4, border: '1px solid var(--amber-b)',
          }}>VOLATILITY ALERTS</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
          Detects stocks about to experience volatility (3%+ move in either direction within 5 days).
          Regime provides directional hint.
        </p>
      </div>

      {/* Regime banner */}
      <RegimeBanner regime={regime} />

      {/* Scanner status */}
      <PreMoveScanner scanning={scanning} lastScan={lastScan} onScan={scan} totalDetections={detections.length} />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
        <div className="metric-card">
          <div className="label">Total Alerts</div>
          <div className="value" style={{ color: 'var(--text-primary)' }}>{detections.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Strong</div>
          <div className="value" style={{ color: 'var(--green)' }}>{strongSignals.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Moderate</div>
          <div className="value" style={{ color: 'var(--amber)' }}>{moderateSignals.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Regime Hint</div>
          <div className="value" style={{
            color: regime?.regime === 'BULLISH' ? 'var(--green)' : regime?.regime === 'BEARISH' ? 'var(--red)' : 'var(--amber)',
            fontSize: 16,
          }}>{regime?.regime || '--'}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>STRENGTH:</span>
        {filterBtn('all', filter, setFilter, 'All')}
        {filterBtn('STRONG', filter, setFilter, 'Strong', 'var(--green)')}
        {filterBtn('MODERATE', filter, setFilter, 'Moderate', 'var(--amber)')}
        {filterBtn('WEAK', filter, setFilter, 'Weak')}

        <span style={{ width: 1, height: 20, background: 'var(--border-widget)', margin: '0 4px' }} />

        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{
          padding: '4px 8px', borderRadius: 4,
          background: 'var(--bg-widget)', border: '1px solid var(--border-widget)',
          color: 'var(--text-secondary)', fontSize: 11,
        }}>
          {sectors.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>)}
        </select>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
            {filtered.length} ALERTS {filter !== 'all' ? `(${filter})` : ''}
          </div>
          {filtered.map(d => <PreMoveCard key={d.ticker} detection={d} />)}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No alerts match your filters.
            </div>
          )}
        </div>

        <div>
          <HistoricalAccuracy accuracy={accuracy} backtesting={backtesting} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 320px"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns: repeat(4"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
