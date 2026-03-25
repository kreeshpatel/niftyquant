import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview } from '../api'
import { T } from '../theme'
import { fmtINR, winRateColor } from '../format'
import MetricCard from '../components/MetricCard'
import EquityChart from '../components/EquityChart'

export default function Overview() {
  const [data, setData] = useState(null)
  useEffect(() => { fetchOverview().then(setData).catch(() => {}) }, [])

  const p = data?.portfolio || {}
  const m = data?.metrics || {}
  const curve = data?.equity_curve || []
  const ret = p.total_return_pct || 0
  const wr = m.win_rate || 0
  const wins = Math.round(wr / 100 * (m.total_trades || 0))
  const losses = (m.total_trades || 0) - wins
  const wrColor = winRateColor(wr, T)

  return (
    <div>
      {/* Metric cards row */}
      <div style={{ display: 'flex', border: `1px solid ${T.bgLine}`, marginBottom: 1 }}>
        <MetricCard label="Final Value" value={fmtINR(p.total_value || 1000000)} color="amb" />
        <MetricCard label="Total Return" value={`${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`} color={ret >= 0 ? 'pos' : 'neg'} />
        <MetricCard label="Win Rate" value={`${wr}%`} color={wr > 40 ? 'pos' : wr >= 20 ? 'amb' : 'neg'}
          sub={`${wins} wins / ${losses} losses`} />
        <MetricCard label="Profit Factor" value={m.profit_factor ?? '\u2014'} color={(m.profit_factor || 0) > 1 ? 'pos' : 'neg'} />
        <MetricCard label="Max Drawdown" value={`${p.drawdown_pct || 0}%`} color="neg" />
        <MetricCard label="Total Trades" value={m.total_trades || 0} color="amb" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1, marginTop: 1 }}>
        {/* Left: equity chart */}
        <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16 }}>
          <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>
            Backtest Equity Curve
          </div>
          {curve.length > 0 ? <EquityChart data={curve} initialCapital={1000000} /> : (
            <div style={{ padding: 60, textAlign: 'center', color: T.textDim, fontSize: 11 }}>
              NO BACKTEST DATA — ADD CSV FILES TO results/
            </div>
          )}
        </div>

        {/* Right: trade summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
              Trade Summary
              <Link to="/trades" style={{ float: 'right', color: T.amber, letterSpacing: 0 }}>VIEW ALL &rarr;</Link>
            </div>
            {[
              ['WIN / LOSS', `${wins} wins / ${losses} losses`, wrColor],
              ['AVG WIN', `+${m.avg_win || 0}%`, T.green],
              ['AVG LOSS', `${m.avg_loss || 0}%`, T.red],
              ['AVG HOLD', `${m.avg_hold_days || 0} days`, T.textPrimary],
              ['PROFIT FACTOR', m.profit_factor ?? '\u2014', (m.profit_factor || 0) > 1 ? T.green : T.red],
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

          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
              Quick Links
            </div>
            {[
              ['/features', 'Feature Importance'],
              ['/walk-forward', 'Walk-Forward Analysis'],
              ['/trades', 'Full Trade Log'],
            ].map(([href, label]) => (
              <Link key={href} to={href} style={{
                display: 'block', padding: '6px 0', color: T.amber, fontSize: 11,
                borderBottom: `1px solid ${T.bgLine}`, letterSpacing: 0.5,
              }}>{label} &rarr;</Link>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 1 }}>
            <MetricCard label="Peak Value" value={fmtINR(p.peak_value || 0)} color="amb" />
            <MetricCard label="Avg Hold" value={`${m.avg_hold_days || 0}d`} color="amb" />
          </div>
        </div>
      </div>
    </div>
  )
}
