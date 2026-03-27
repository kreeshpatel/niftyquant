import React, { useState, useMemo } from 'react'
import { usePreMoveDetection } from '../hooks/usePreMoveDetection'
import { detectRegime } from '../utils/preMove'
import PreMoveCard from '../components/premove/PreMoveCard'
import PreMoveScanner from '../components/premove/PreMoveScanner'
import HistoricalAccuracy from '../components/premove/HistoricalAccuracy'

export default function PreMove() {
  const { detections, accuracy, scanning, lastScan, strongSignals, moderateSignals, backtesting, scan } = usePreMoveDetection()
  const [filter, setFilter] = useState('STRONG')
  const [sectorFilter, setSectorFilter] = useState('all')

  const regime = useMemo(() => detectRegime(), [])
  const isBullish = regime?.regime === 'BULLISH'

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
            fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.08em',
            padding: '2px 8px', background: 'var(--green-d)', borderRadius: 4, border: '1px solid var(--green-b)',
          }}>+3.5% BACKTESTED</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
          Detects stocks about to move 3%+ &middot; Trade STRONG signals in BULLISH regime
        </p>
      </div>

      {/* Regime + trading status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', marginBottom: 12, borderRadius: 'var(--r-md)',
        background: isBullish ? 'var(--green-d)' : regime?.regime === 'BEARISH' ? 'var(--red-d)' : 'var(--amber-d)',
        border: `1px solid ${isBullish ? 'var(--green-b)' : regime?.regime === 'BEARISH' ? 'var(--red-b)' : 'var(--amber-b)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isBullish ? 'var(--green)' : regime?.regime === 'BEARISH' ? 'var(--red)' : 'var(--amber)',
            animation: 'pulse 2s infinite',
          }} />
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
              color: isBullish ? 'var(--green)' : regime?.regime === 'BEARISH' ? 'var(--red)' : 'var(--amber)',
            }}>
              {isBullish ? 'BULLISH REGIME \u2014 Trading enabled' : regime?.regime === 'BEARISH' ? 'BEARISH REGIME \u2014 Trading disabled' : 'NEUTRAL REGIME \u2014 Wait for better conditions'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Avg: {regime?.avgDayChange >= 0 ? '+' : ''}{regime?.avgDayChange}% &middot;
              {regime?.pctPositive}% up / {regime?.pctNegative}% down
            </div>
          </div>
        </div>
        {!isBullish && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Only STRONG signals in BULLISH regime are tradeable
          </span>
        )}
      </div>

      {/* Scanner */}
      <PreMoveScanner scanning={scanning} lastScan={lastScan} onScan={scan} totalDetections={detections.length} />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
        <div className="metric-card">
          <div className="label">Total Alerts</div>
          <div className="value" style={{ color: 'var(--text-primary)' }}>{detections.length}</div>
        </div>
        <div className="metric-card" style={{ borderColor: 'var(--green-b)' }}>
          <div className="label">Strong (tradeable)</div>
          <div className="value" style={{ color: 'var(--green)' }}>{strongSignals.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Moderate</div>
          <div className="value" style={{ color: 'var(--amber)' }}>{moderateSignals.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Regime</div>
          <div className="value" style={{
            color: isBullish ? 'var(--green)' : regime?.regime === 'BEARISH' ? 'var(--red)' : 'var(--amber)',
            fontSize: 16,
          }}>{regime?.regime || '--'}</div>
          <div className="sub">{isBullish ? 'Trading ON' : 'Trading OFF'}</div>
        </div>
      </div>

      {/* Filters — default to STRONG */}
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
          {filtered.map(d => <PreMoveCard key={d.ticker} detection={d} regime={regime} />)}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No alerts match your filters.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <HistoricalAccuracy accuracy={accuracy} backtesting={backtesting} />

          {/* Strategy config panel */}
          <div className="widget">
            <div className="widget-header">Active Strategy</div>
            <div className="widget-body" style={{ fontSize: 11 }}>
              {[
                ['Signal', 'STRONG only (\u22650.58)'],
                ['Regime', isBullish ? 'BULLISH (active)' : `${regime?.regime} (waiting)`],
                ['Target', '+5%'],
                ['Stop', '-3%'],
                ['Max hold', '5 days'],
                ['Positions', 'Max 10'],
                ['Risk/trade', '1.5%'],
                ['Backtest', '+3.5% (454 trades)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: k === 'Regime' ? (isBullish ? 'var(--green)' : 'var(--amber)') : 'var(--text-secondary)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
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
