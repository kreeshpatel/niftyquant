import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, useWebSocket } from '../api'
import { T, pnlColor, regimeColor } from '../theme'
import MetricCard from '../components/MetricCard'
import EquityChart from '../components/EquityChart'

export default function Overview() {
  const [data, setData] = useState(null)
  const { data: ws } = useWebSocket()
  useEffect(() => { fetchOverview().then(setData).catch(() => {}) }, [])

  const p = ws?.portfolio || data?.portfolio || {}
  const m = data?.metrics || {}
  const curve = data?.equity_curve || []
  const regime = ws?.regime || {}
  const ret = p.total_return_pct || 0

  return (
    <div>
      {/* Metric cards row */}
      <div style={{ display: 'flex', border: `1px solid ${T.bgLine}`, marginBottom: 1 }}>
        <MetricCard label="Portfolio Value" value={`Rs ${(p.total_value || 1000000).toLocaleString()}`} color="amb" />
        <MetricCard label="Total Return" value={`${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`} color={ret >= 0 ? 'pos' : 'neg'} />
        <MetricCard label="Sharpe Ratio" value={m.sharpe_ratio ?? '—'} color={(m.sharpe_ratio || 0) > 0.5 ? 'pos' : 'neg'} />
        <MetricCard label="Win Rate" value={`${m.win_rate || 0}%`} color={(m.win_rate || 0) > 30 ? 'pos' : 'neg'} />
        <MetricCard label="Profit Factor" value={m.profit_factor ?? '—'} color={(m.profit_factor || 0) > 1 ? 'pos' : 'neg'} />
        <MetricCard label="Max Drawdown" value={`${p.drawdown_pct || 0}%`} color="neg" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1, marginTop: 1 }}>
        {/* Left: equity chart + positions mini-table */}
        <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16 }}>
          <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>
            Equity Curve
          </div>
          {curve.length > 0 ? <EquityChart data={curve} /> : (
            <div style={{ padding: 60, textAlign: 'center', color: T.textDim, fontSize: 11 }}>
              RUN DAILY RUNNER TO GENERATE DATA
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Open Positions
            <Link to="/positions" style={{ float: 'right', color: T.amber, letterSpacing: 0 }}>VIEW ALL →</Link>
          </div>
          <div style={{ color: T.textMuted, fontSize: 11 }}>
            {(p.n_positions || 0) === 0 ? 'No open positions' : `${p.n_positions} positions open`}
          </div>
        </div>

        {/* Right: signals + regime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
              Today's Signals
              <Link to="/signals" style={{ float: 'right', color: T.amber, letterSpacing: 0 }}>SCAN →</Link>
            </div>
            <div style={{ color: T.textMuted, fontSize: 11 }}>
              {regime.regime === 'BEAR' ? 'BEAR regime — signals blocked' : 'Check signals page'}
            </div>
          </div>

          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
              Market Regime
            </div>
            {[
              ['REGIME', regime.regime || '—', regimeColor(regime.regime)],
              ['CONFIDENCE', `${((regime.confidence || 0) * 100).toFixed(0)}%`, T.textPrimary],
              ['VIX', regime.vix || '—', T.textPrimary],
              ['BREADTH', regime.breadth ? `${(regime.breadth * 100).toFixed(1)}%` : '—', T.textPrimary],
              ['NIFTY RSI', regime.nifty_rsi || '—', T.textPrimary],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                borderBottom: `1px solid ${T.bgLine}`, fontSize: 11,
              }}>
                <span style={{ color: T.textDim, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>{label}</span>
                <span style={{ color, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 1 }}>
            <MetricCard label="Total Trades" value={m.total_trades || 0} />
            <MetricCard label="Avg Hold" value={`${m.avg_hold_days || 0}d`} />
          </div>
        </div>
      </div>
    </div>
  )
}
