import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function getBarColor(winRate) {
  if (winRate > 45) return '#34d399'
  if (winRate > 35) return '#fbbf24'
  return '#f87171'
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background: '#111114',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      fontFamily: 'var(--mono)',
      fontSize: 11,
    }}>
      <div style={{ color: '#e8e8f0', fontWeight: 600, marginBottom: 6 }}>{d.sector}</div>
      <div style={{ color: getBarColor(d.win_rate) }}>Win rate: {d.win_rate?.toFixed(1)}%</div>
      <div style={{ color: 'rgba(255,255,255,0.4)' }}>Trades: {d.trades}</div>
      <div style={{ color: d.avg_return >= 0 ? '#34d399' : '#f87171' }}>
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
      <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.75} rx={3} />
      <rect x={x} y={y} width={2} height={height} fill={color} rx={1} />
    </g>
  )
}

export default function SectorChart({ data = [] }) {
  if (data.length === 0) return null

  const chartHeight = Math.max(data.length * 34, 120)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fill: '#ffffff15', fontFamily: 'Fira Code', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sector" tick={{ fill: '#ffffff40', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} width={75} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff05' }} />
        <Bar dataKey="trades" radius={[0, 4, 4, 0]} barSize={16} shape={<ColoredBar />} label={({ x, y, width, height, value, payload }) => (
          <text
            x={x + width + 6} y={y + height / 2}
            fill={getBarColor(payload?.win_rate || 0)}
            fontFamily="Fira Code" fontSize={9} dominantBaseline="central"
          >
            {payload?.win_rate?.toFixed(0)}% · {value}
          </text>
        )} />
      </BarChart>
    </ResponsiveContainer>
  )
}
