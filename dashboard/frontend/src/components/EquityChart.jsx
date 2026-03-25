import React, { useState } from 'react'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { T } from '../theme'
import { fmtINR } from '../format'

const ranges = { '3M': 63, '6M': 126, '1Y': 252, 'ALL': 99999 }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: T.bgElevated, border: `1px solid ${T.bgLine}`, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: T.textDim, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {fmtINR(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function EquityChart({ data = [], initialCapital = 1000000 }) {
  const [range, setRange] = useState('ALL')
  const sliced = data.slice(-ranges[range])

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
        {Object.keys(ranges).map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            padding: '4px 12px', fontSize: 10, letterSpacing: 1.5, cursor: 'pointer',
            background: 'transparent', border: 'none', color: range === r ? T.amber : T.textDim,
            borderBottom: range === r ? `2px solid ${T.amber}` : '2px solid transparent',
          }}>{r}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={sliced}>
          <CartesianGrid stroke={T.bgLine} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={T.textDim} tick={{ fill: T.textDim, fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis stroke={T.textDim} tick={{ fill: T.textDim, fontSize: 10 }}
            tickFormatter={v => `${(v / 100000).toFixed(1)}L`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={initialCapital} stroke={T.textDim} strokeDasharray="6 4" label={{
            value: `${fmtINR(initialCapital)} start`, fill: T.textDim, fontSize: 9, position: 'right',
          }} />
          <Line type="monotone" dataKey="value" stroke={T.blue} strokeWidth={2} dot={false} name="Strategy" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
