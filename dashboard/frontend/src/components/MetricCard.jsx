import React from 'react'
import { T } from '../theme'

const colorMap = { pos: T.green, neg: T.red, amb: T.amber, dim: T.textMuted }

export default function MetricCard({ label, value, sub, color = 'dim' }) {
  return (
    <div style={{
      background: T.bgPanel, padding: '14px 16px', flex: 1, minWidth: 140,
      borderRight: `1px solid ${T.bgLine}`,
    }}>
      <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colorMap[color] || color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
