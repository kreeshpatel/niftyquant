import React, { useEffect, useState } from 'react'
import { fetchPositions } from '../api'
import { T, pnlColor } from '../theme'
import TerminalTable from '../components/TerminalTable'

function bufferBg(pct) {
  if (pct > 30) return T.dimGreen
  if (pct > 15) return T.dimAmber
  return T.dimRed
}

const columns = [
  { key: 'ticker', label: 'Ticker', render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
  { key: 'sector', label: 'Sector', style: () => ({ fontSize: 10, color: T.textDim }) },
  { key: 'entry_date', label: 'Entry', style: () => ({ fontSize: 11 }) },
  { key: 'entry_price', label: 'Entry Rs', align: 'right', render: v => v?.toFixed(2) },
  { key: 'current_price', label: 'Current Rs', align: 'right', render: v => v?.toFixed(2) },
  { key: 'unrealised_pnl', label: 'P&L Rs', align: 'right',
    render: v => <span style={{ color: pnlColor(v) }}>{v >= 0 ? '+' : ''}{v?.toLocaleString()}</span> },
  { key: 'unrealised_pnl_pct', label: 'P&L %', align: 'right',
    render: v => <span style={{ color: pnlColor(v), fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v?.toFixed(1)}%</span>,
    style: (row) => ({ borderLeft: `3px solid ${pnlColor(row.unrealised_pnl_pct)}` }) },
  { key: 'atr_stop', label: 'Stop Rs', align: 'right', render: v => v?.toFixed(2) },
  { key: 'stop_distance_pct', label: 'Buffer %', align: 'right',
    render: (v) => <span style={{ padding: '1px 6px', background: bufferBg(v) }}>{v?.toFixed(1)}%</span> },
  { key: 'hold_days', label: 'Days', align: 'right' },
  { key: 'ml_score', label: 'ML', align: 'right', render: v => v?.toFixed(3) },
]

export default function Positions() {
  const [positions, setPositions] = useState([])
  useEffect(() => { fetchPositions().then(setPositions).catch(() => {}) }, [])

  const totalPnl = positions.reduce((s, p) => s + (p.unrealised_pnl || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Open Positions ({positions.length})
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: pnlColor(totalPnl) }}>
          UNREALISED: {totalPnl >= 0 ? '+' : ''}Rs {totalPnl.toLocaleString()}
        </span>
      </div>
      <div style={{ border: `1px solid ${T.bgLine}` }}>
        <TerminalTable columns={columns} rows={positions} />
      </div>
    </div>
  )
}
