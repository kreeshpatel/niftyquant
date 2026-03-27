import React, { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatLakh } from '../api'

const ranges = [
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
  { label: 'ALL', days: 0 },
]

function CustomCursor({ points, viewBox }) {
  if (!points?.[0]) return null
  const { x, y } = points[0]
  return (
    <g>
      <line x1={x} y1={viewBox?.y || 0} x2={x} y2={(viewBox?.y || 0) + (viewBox?.height || 300)} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} strokeDasharray="4 3" />
      <line x1={viewBox?.x || 0} y1={y} x2={(viewBox?.x || 0) + (viewBox?.width || 600)} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} strokeDasharray="4 3" />
      <circle cx={x} cy={y} r={4} fill="var(--accent-green)" stroke="#0a0a0a" strokeWidth={2} />
    </g>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const strategy = d?.value
  const nifty = d?.nifty
  const fmtDate = label ? new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 12,
      padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{fmtDate}</div>
      {strategy != null && (
        <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--accent-green)', marginBottom: 3 }}>
          <span>Strategy</span><span style={{ fontWeight: 500 }}>{formatLakh(strategy)}</span>
        </div>
      )}
      {nifty > 0 && (
        <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-tertiary)' }}>
          <span>Nifty 50</span><span>{formatLakh(nifty)}</span>
        </div>
      )}
      {strategy != null && nifty > 0 && (
        <div className="tabular" style={{
          borderTop: '0.5px solid var(--border-subtle)', marginTop: 6, paddingTop: 6, fontSize: 11,
          color: strategy > nifty ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          Alpha: {strategy > nifty ? '+' : ''}{formatLakh(strategy - nifty)}
        </div>
      )}
      {d?.drawdown != null && d.drawdown < 0 && (
        <div className="tabular" style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 3 }}>DD: {d.drawdown.toFixed(1)}%</div>
      )}
    </div>
  )
}

function TradeMarkerDot({ cx, cy, payload, markers }) {
  if (!cx || !cy || !markers) return null
  const m = markers.find(t => t.date === payload?.date)
  if (!m) return null
  const isEntry = m.type === 'entry'
  const color = m.is_win ? 'var(--accent-green)' : 'var(--accent-red)'
  const dy = isEntry ? -8 : 8
  return (
    <polygon
      points={isEntry
        ? `${cx},${cy + dy} ${cx - 4},${cy} ${cx + 4},${cy}`
        : `${cx},${cy + dy} ${cx - 4},${cy} ${cx + 4},${cy}`}
      fill={color} opacity={0.85}
    />
  )
}

export default function EquityChart({ data = [], markers = [], height = 220 }) {
  const [range, setRange] = useState('ALL')
  const [fade, setFade] = useState(false)
  const [showTrades, setShowTrades] = useState(false)

  const filtered = useMemo(() => {
    const r = ranges.find(r => r.label === range)
    if (!r || r.days === 0) return data
    return data.slice(-r.days)
  }, [data, range])

  const switchRange = (label) => {
    setFade(true)
    setTimeout(() => { setRange(label); setFade(false) }, 150)
  }

  const filteredMarkers = (showTrades && range === 'ALL' && markers.length > 0)
    ? markers.filter(m => {
        const r = Math.abs(m.return_pct || 0)
        if (m.type === 'entry') return r > 5
        if (m.is_win) return m.return_pct > 8
        return m.return_pct < -4
      })
    : []
  const hasMarkers = filteredMarkers.length > 0

  const btnBase = {
    padding: '5px 14px', borderRadius: 'var(--r-sm)',
    fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
    border: '0.5px solid transparent',
    transition: 'all 0.2s var(--ease-out)',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setShowTrades(s => !s)} style={{
          ...btnBase,
          background: showTrades ? 'var(--green-d)' : 'transparent',
          color: showTrades ? 'var(--accent-green)' : 'var(--text-tertiary)',
          borderColor: showTrades ? 'var(--green-b)' : 'transparent',
          marginRight: 8,
        }}>{showTrades ? 'Trades on' : 'Show trades'}</button>
        {ranges.map(r => (
          <button key={r.label} onClick={() => switchRange(r.label)} style={{
            ...btnBase,
            background: range === r.label ? 'var(--purple-d)' : 'transparent',
            color: range === r.label ? 'var(--accent-purple)' : 'var(--text-tertiary)',
            borderColor: range === r.label ? 'var(--purple-b)' : 'transparent',
          }}>{r.label}</button>
        ))}
      </div>

      <div style={{ opacity: fade ? 0.3 : 1, transition: 'opacity 0.15s' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C896" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00C896" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6e6e73', fontFamily: 'var(--mono)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={80} />
            <YAxis tick={{ fill: '#6e6e73', fontFamily: 'var(--mono)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 100000).toFixed(0)}L`} width={36} domain={['auto', 'auto']} />
            <Tooltip cursor={<CustomCursor />} content={<ChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#greenGrad)" fillOpacity={0.15} />
            {filtered[0]?.nifty > 0 && (
              <Line type="monotone" dataKey="nifty" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            )}
            <Line
              type="monotone" dataKey="value" stroke="#00C896" strokeWidth={2} strokeLinecap="round"
              dot={hasMarkers ? <TradeMarkerDot markers={filteredMarkers} /> : false}
              activeDot={{ r: 5, fill: '#00C896', stroke: '#0a0a0a', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {filtered.some(d => d.drawdown != null && d.drawdown < 0) && (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginTop: 12, marginBottom: 6 }}>Drawdown</div>
            <ResponsiveContainer width="100%" height={60}>
              <ComposedChart data={filtered} margin={{ top: 0, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF453A" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF453A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fill: '#48484a', fontFamily: 'var(--mono)', fontSize: 11 }} tickLine={false} axisLine={false} width={36} domain={['auto', 0]} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Area type="monotone" dataKey="drawdown" stroke="#FF453A" strokeWidth={1} strokeLinecap="round" fill="url(#redGrad)" fillOpacity={0.15} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
