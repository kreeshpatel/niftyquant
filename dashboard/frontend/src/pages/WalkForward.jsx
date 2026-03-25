import React, { useEffect, useState } from 'react'
import { fetchSignals } from '../api'
import { T, pnlColor } from '../theme'
import TerminalTable from '../components/TerminalTable'
import MetricCard from '../components/MetricCard'

export default function WalkForward() {
  const [data, setData] = useState(null)
  useEffect(() => { fetchSignals().then(setData).catch(() => {}) }, [])

  const folds = data?.folds || []

  const avgAuc = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.roc_auc || 0), 0) / folds.length).toFixed(3) : 0
  const avgReturn = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.avg_return || 0), 0) / folds.length).toFixed(2) : 0
  const avgWinRate = folds.length > 0
    ? (folds.reduce((s, f) => s + (f.win_rate || 0), 0) / folds.length).toFixed(1) : 0
  const totalSignals = folds.reduce((s, f) => s + (f.n_signals || 0), 0)

  const columns = [
    { key: 'fold', label: 'Fold', render: v => <span style={{ fontWeight: 700 }}>#{v}</span> },
    { key: 'test_start', label: 'Test Start', style: () => ({ fontSize: 11 }) },
    { key: 'test_end', label: 'Test End', style: () => ({ fontSize: 11 }) },
    { key: 'n_train', label: 'Train', align: 'right',
      render: v => v?.toLocaleString?.() ?? v },
    { key: 'n_test', label: 'Test', align: 'right',
      render: v => v?.toLocaleString?.() ?? v },
    { key: 'roc_auc', label: 'ROC-AUC', align: 'right',
      render: v => <span style={{ color: v > 0.52 ? T.green : T.red, fontWeight: 700 }}>{v?.toFixed?.(3) ?? v}</span> },
    { key: 'n_signals', label: 'Signals', align: 'right',
      render: v => v?.toLocaleString?.() ?? v },
    { key: 'win_rate', label: 'Win Rate', align: 'right',
      render: v => <span style={{ color: pnlColor(v - 35) }}>{v?.toFixed?.(1) ?? v}%</span> },
    { key: 'avg_return', label: 'Avg Return', align: 'right',
      render: v => <span style={{ color: pnlColor(v), fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v?.toFixed?.(2) ?? v}%</span> },
  ]

  return (
    <div>
      {/* Summary metrics */}
      <div style={{ display: 'flex', border: `1px solid ${T.bgLine}`, marginBottom: 1 }}>
        <MetricCard label="Mean ROC-AUC" value={avgAuc} color={avgAuc > 0.52 ? 'pos' : 'neg'} />
        <MetricCard label="Avg Return" value={`${avgReturn >= 0 ? '+' : ''}${avgReturn}%`} color={avgReturn >= 0 ? 'pos' : 'neg'} />
        <MetricCard label="Avg Win Rate" value={`${avgWinRate}%`} color={avgWinRate > 30 ? 'pos' : 'neg'} />
        <MetricCard label="Total Signals" value={totalSignals.toLocaleString()} />
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
