import React, { useMemo } from 'react'
import { detectRegime } from '../../utils/preMove'

export default function StrategyWidget() {
  const regime = useMemo(() => detectRegime(), [])
  const isBullish = regime?.regime === 'BULLISH'

  return (
    <div className="widget">
      <div className="widget-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isBullish ? 'var(--green)' : 'var(--amber)',
            animation: 'pulse 2s infinite',
          }} />
          Active Strategy
        </span>
        <span style={{ fontSize: 10, color: isBullish ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
          {isBullish ? 'TRADING' : 'WAITING'}
        </span>
      </div>
      <div className="widget-body" style={{ fontSize: 11 }}>
        {[
          ['Signal', 'STRONG (\u22650.58)', 'var(--green)'],
          ['Regime', regime?.regime || '--', isBullish ? 'var(--green)' : 'var(--amber)'],
          ['Target / Stop', '+5% / -3%', 'var(--text-secondary)'],
          ['Max hold', '5 days', 'var(--text-secondary)'],
          ['Backtest', '+3.5% (454t)', 'var(--green)'],
        ].map(([k, v, c]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ color: c, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
