import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function getBarColor(winRate) {
  if (winRate > 45) return '#00C896'
  if (winRate > 35) return '#FF9F0A'
  return '#FF453A'
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '0.5px solid var(--border-default)',
      borderRadius: 12,
      padding: '10px 14px',
      fontFamily: 'var(--mono)',
      fontSize: 11,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{d.sector}</div>
      <div style={{ color: getBarColor(d.win_rate) }}>Win rate: {d.win_rate?.toFixed(1)}%</div>
      <div style={{ color: 'var(--text-secondary)' }}>Trades: {d.trades}</div>
      <div style={{ color: d.avg_return >= 0 ? '#00C896' : '#FF453A' }}>
        Avg return: {d.avg_return >= 0 ? '+' : ''}{d.avg_return?.toFixed(1)}%
      </div>
    </div>
  )
}

const ColoredBar = (props) => {
  const { x, y, width, height, payload } = props
  const color = getBarColor(payload?.win_rate || 0)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.85} rx={4} />
    </g>
  )
}

export default function SectorChart({ data = [] }) {
  if (data.length === 0) return null

  const chartHeight = Math.max(data.length * 34, 120)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fill: '#48484a', fontFamily: 'var(--mono)', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sector" tick={{ fill: '#a1a1a6', fontFamily: 'var(--mono)', fontSize: 11 }} tickLine={false} axisLine={false} width={75} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="trades" radius={[0, 4, 4, 0]} barSize={16} label={({ x, y, width, height, value, index }) => {
          const d = data[index]
          return (
            <text
              x={x + width + 6} y={y + height / 2}
              fill={getBarColor(d?.win_rate || 0)}
              fontFamily="var(--mono)" fontSize={11} dominantBaseline="central"
            >
              {d?.win_rate?.toFixed(0)}% · {value}
            </text>
          )
        }}>
          {data.map((d, i) => (
            <Cell key={i} fill={getBarColor(d.win_rate || 0)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
