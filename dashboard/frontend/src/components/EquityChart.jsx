import React, { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ranges = [
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
  { label: 'ALL', days: 0 },
]

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#111113', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', fontFamily: 'var(--text-mono)', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>{d?.date}</div>
      <div style={{ color: '#a78bfa' }}>Strategy: {Number(d?.value || 0).toLocaleString('en-IN')}</div>
      {d?.nifty > 0 && <div style={{ color: '#ffffff30' }}>Nifty B&H: {Number(d.nifty).toLocaleString('en-IN')}</div>}
      {d?.drawdown != null && d.drawdown < 0 && <div style={{ color: '#f87171' }}>DD: {d.drawdown.toFixed(1)}%</div>}
    </div>
  )
}

export default function EquityChart({ data = [], height = 220 }) {
  const [range, setRange] = useState('ALL')
  const [fade, setFade] = useState(false)

  const filtered = useMemo(() => {
    const r = ranges.find(r => r.label === range)
    if (!r || r.days === 0) return data
    return data.slice(-r.days)
  }, [data, range])

  const switchRange = (label) => {
    setFade(true)
    setTimeout(() => { setRange(label); setFade(false) }, 150)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {ranges.map(r => (
          <button key={r.label} onClick={() => switchRange(r.label)} style={{
            padding: '4px 12px', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--text-mono)', fontSize: 10, cursor: 'pointer',
            background: range === r.label ? 'var(--purple-bg)' : 'transparent',
            color: range === r.label ? 'var(--purple)' : 'var(--text-dim)',
            border: `1px solid ${range === r.label ? 'var(--purple-border)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>{r.label}</button>
        ))}
      </div>

      <div style={{ opacity: fade ? 0.3 : 1, transition: 'opacity 0.15s' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal stroke="#ffffff06" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={80} />
            <YAxis tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 100000).toFixed(0)}L`} width={36} domain={['auto', 'auto']} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#purpleGrad)" />
            {filtered[0]?.nifty > 0 && (
              <Line type="monotone" dataKey="nifty" stroke="#ffffff15" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            )}
            <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {filtered.some(d => d.drawdown != null && d.drawdown < 0) && (
          <>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8, marginBottom: 4 }}>Drawdown</div>
            <ResponsiveContainer width="100%" height={60}>
              <ComposedChart data={filtered} margin={{ top: 0, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fill: '#ffffff15', fontFamily: 'Fira Code', fontSize: 9 }} tickLine={false} axisLine={false} width={36} domain={['auto', 0]} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Area type="monotone" dataKey="drawdown" stroke="#f87171" strokeWidth={1} fill="url(#redGrad)" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
