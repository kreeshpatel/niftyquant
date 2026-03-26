import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#111113', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', fontFamily: 'var(--text-mono)', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{d?.sector}</div>
      <div style={{ color: 'var(--text-dim)' }}>Trades: {d?.trades}</div>
      <div style={{ color: d?.win_rate > 40 ? 'var(--green)' : d?.win_rate < 30 ? 'var(--red)' : 'var(--amber)' }}>Win rate: {d?.win_rate}%</div>
      <div style={{ color: d?.avg_return >= 0 ? 'var(--green)' : 'var(--red)' }}>Avg return: {d?.avg_return >= 0 ? '+' : ''}{d?.avg_return}%</div>
    </div>
  )
}

export default function SectorChart({ data = [] }) {
  if (data.length === 0) return null

  const chartHeight = Math.max(data.length * 32, 120)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fill: '#ffffff15', fontFamily: 'Fira Code', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sector" tick={{ fill: '#ffffff40', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff05' }} />
        <Bar dataKey="trades" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.win_rate > 40 ? '#818cf8B3' : d.win_rate < 30 ? '#f87171B3' : '#fbbf24B3'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
