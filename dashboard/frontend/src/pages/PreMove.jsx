import React, { useState, useMemo } from 'react'
import { usePreMoveDetection } from '../hooks/usePreMoveDetection'
import PreMoveCard from '../components/premove/PreMoveCard'
import PreMoveScanner from '../components/premove/PreMoveScanner'
import HistoricalAccuracy from '../components/premove/HistoricalAccuracy'

export default function PreMove() {
  const { detections, accuracy, scanning, lastScan, strongSignals, moderateSignals, scan } = usePreMoveDetection()
  const [filter, setFilter] = useState('all') // all, STRONG, MODERATE, WEAK
  const [dirFilter, setDirFilter] = useState('all') // all, BULLISH, BEARISH, NEUTRAL
  const [sectorFilter, setSectorFilter] = useState('all')

  const sectors = useMemo(() => {
    const set = new Set(detections.map(d => d.sector))
    return ['all', ...Array.from(set).sort()]
  }, [detections])

  const filtered = useMemo(() => {
    return detections.filter(d => {
      if (filter !== 'all' && d.strength !== filter) return false
      if (dirFilter !== 'all' && d.direction !== dirFilter) return false
      if (sectorFilter !== 'all' && d.sector !== sectorFilter) return false
      return true
    })
  }, [detections, filter, dirFilter, sectorFilter])

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
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Pre-Move Detection Engine</h1>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.08em',
            padding: '2px 8px', background: 'var(--green-d)', borderRadius: 4, border: '1px solid var(--green-b)',
          }}>YOUR EDGE</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
          Detects stocks about to make significant moves by analyzing 5 proprietary signals across 360+ NSE stocks.
        </p>
      </div>

      {/* Scanner status */}
      <PreMoveScanner scanning={scanning} lastScan={lastScan} onScan={scan} totalDetections={detections.length} />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
        <div className="metric-card">
          <div className="label">Total Signals</div>
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
          <div className="label">Bullish Bias</div>
          <div className="value" style={{ color: 'var(--blue)' }}>
            {detections.filter(d => d.direction === 'BULLISH').length}
          </div>
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

        <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>DIR:</span>
        {filterBtn('all', dirFilter, setDirFilter, 'All')}
        {filterBtn('BULLISH', dirFilter, setDirFilter, '\u25B2 Bull', 'var(--green)')}
        {filterBtn('BEARISH', dirFilter, setDirFilter, '\u25BC Bear', 'var(--red)')}

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
        {/* Detection cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
            {filtered.length} SIGNALS {filter !== 'all' ? `(${filter})` : ''}
          </div>
          {filtered.map(d => <PreMoveCard key={d.ticker} detection={d} />)}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No signals match your filters.
            </div>
          )}
        </div>

        {/* Sidebar — Historical accuracy */}
        <div>
          <HistoricalAccuracy accuracy={accuracy} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="gridTemplateColumns: repeat(4"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
