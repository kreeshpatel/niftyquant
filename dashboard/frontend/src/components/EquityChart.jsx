import React, { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ranges = [
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
  { label: 'ALL', days: 0 },
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#111113', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', fontFamily: 'var(--text-mono)', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>{d?.date}</div>
      <div style={{ color: 'var(--purple)' }}>Strategy: {Number(d?.value || 0).toLocaleString('en-IN')}</div>
    </div>
  )
}

export default function EquityChart({ data = [], height = 180 }) {
  const [range, setRange] = useState('ALL')

  const filtered = useMemo(() => {
    const r = ranges.find(r => r.label === range)
    if (!r || r.days === 0) return data
    return data.slice(-r.days)
  }, [data, range])

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {ranges.map(r => (
          <button key={r.label} onClick={() => setRange(r.label)} style={{
            padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
            fontFamily: 'var(--text-mono)', fontSize: 10, cursor: 'pointer',
            background: range === r.label ? 'var(--purple-bg)' : 'transparent',
            color: range === r.label ? 'var(--purple)' : 'var(--text-dim)',
            borderWidth: 1, borderStyle: 'solid',
            borderColor: range === r.label ? 'var(--purple-border)' : 'transparent',
            transition: 'all 0.15s',
          }}>{r.label}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal stroke="#ffffff06" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={60} />
          <YAxis tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 100000).toFixed(0)}L`} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#purpleGrad)" />
          <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
