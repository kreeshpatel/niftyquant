import React, { useEffect, useState } from 'react'
import { fetchSignals } from '../api'
import { T, pnlColor } from '../theme'
import TerminalTable from '../components/TerminalTable'
import MetricCard from '../components/MetricCard'

export default function WalkForward() {
  const [data, setData] = useState(null)
  useEffect(() => { fetchSignals().then(setData).catch(() => {}) }, [])

  const folds = data?.folds || []

  const avgReturn = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.return_pct || 0), 0) / folds.length).toFixed(2) : 0
  const avgSharpe = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.sharpe || 0), 0) / folds.length).toFixed(2) : 0
  const avgWinRate = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.win_rate || 0), 0) / folds.length).toFixed(1) : 0
  const totalTrades = folds.reduce((s, f) => s + (f.trades || 0), 0)

  const columns = [
    { key: 'fold', label: 'Fold', render: v => <span style={{ fontWeight: 700 }}>#{v}</span> },
    { key: 'train_start', label: 'Train Start', style: () => ({ fontSize: 11 }) },
    { key: 'train_end', label: 'Train End', style: () => ({ fontSize: 11 }) },
    { key: 'test_start', label: 'Test Start', style: () => ({ fontSize: 11 }) },
    { key: 'test_end', label: 'Test End', style: () => ({ fontSize: 11 }) },
    { key: 'return_pct', label: 'Return %', align: 'right',
      render: v => <span style={{ color: pnlColor(v), fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v?.toFixed?.(2) ?? v}%</span> },
    { key: 'sharpe', label: 'Sharpe', align: 'right',
      render: v => <span style={{ color: v > 0.5 ? T.green : T.red }}>{v?.toFixed?.(2) ?? v}</span> },
    { key: 'max_drawdown', label: 'Max DD', align: 'right',
      render: v => <span style={{ color: T.red }}>{v?.toFixed?.(2) ?? v}%</span> },
    { key: 'win_rate', label: 'Win Rate', align: 'right',
      render: v => `${v?.toFixed?.(1) ?? v}%` },
    { key: 'trades', label: 'Trades', align: 'right' },
  ]

  return (
    <div>
      {/* Summary metrics */}
      <div style={{ display: 'flex', border: `1px solid ${T.bgLine}`, marginBottom: 1 }}>
        <MetricCard label="Avg Return" value={`${avgReturn >= 0 ? '+' : ''}${avgReturn}%`} color={avgReturn >= 0 ? 'pos' : 'neg'} />
        <MetricCard label="Avg Sharpe" value={avgSharpe} color={avgSharpe > 0.5 ? 'pos' : 'neg'} />
        <MetricCard label="Avg Win Rate" value={`${avgWinRate}%`} color={avgWinRate > 30 ? 'pos' : 'neg'} />
        <MetricCard label="Total Trades" value={totalTrades} />
        <MetricCard label="Folds" value={folds.length} />
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${T.bgLine}` }}>
        <div style={{ padding: '8px 12px', fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase', background: T.bgPanel }}>
          Walk-Forward Folds
        </div>
        {folds.length > 0 ? (
          <TerminalTable columns={columns} rows={folds} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: 11 }}>
            NO WALK-FORWARD DATA — ADD walk_forward.csv TO results/
          </div>
        )}
      </div>
    </div>
  )
}
