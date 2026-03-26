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
      <line x1={x} y1={viewBox?.y || 0} x2={x} y2={(viewBox?.y || 0) + (viewBox?.height || 300)} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={viewBox?.x || 0} y1={y} x2={(viewBox?.x || 0) + (viewBox?.width || 600)} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 3" />
      <circle cx={x} cy={y} r={4} fill="#818cf8" stroke="#080810" strokeWidth={2} />
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
      background: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
      padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontSize: 10 }}>{fmtDate}</div>
      {strategy != null && (
        <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#818cf8', marginBottom: 3 }}>
          <span>Strategy</span><span style={{ fontWeight: 500 }}>{formatLakh(strategy)}</span>
        </div>
      )}
      {nifty > 0 && (
        <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'rgba(255,255,255,0.3)' }}>
          <span>Nifty 50</span><span>{formatLakh(nifty)}</span>
        </div>
      )}
      {strategy != null && nifty > 0 && (
        <div className="tabular" style={{
          borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6, fontSize: 10,
          color: strategy > nifty ? '#34d399' : '#f87171',
        }}>
          Alpha: {strategy > nifty ? '+' : ''}{formatLakh(strategy - nifty)}
        </div>
      )}
      {d?.drawdown != null && d.drawdown < 0 && (
        <div className="tabular" style={{ color: '#f87171', fontSize: 10, marginTop: 3 }}>DD: {d.drawdown.toFixed(1)}%</div>
      )}
    </div>
  )
}

function TradeMarkerDot({ cx, cy, payload, markers }) {
  if (!cx || !cy || !markers) return null
  const m = markers.find(t => t.date === payload?.date)
  if (!m) return null
  const isEntry = m.type === 'entry'
  const color = m.is_win ? '#34d399' : '#f87171'
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

  // Only show significant markers on ALL view when toggled on
  const filteredMarkers = (showTrades && range === 'ALL' && markers.length > 0)
    ? markers.filter(m => {
        const r = Math.abs(m.return_pct || 0)
        if (m.type === 'entry') return r > 5
        if (m.is_win) return m.return_pct > 8
        return m.return_pct < -4
      })
    : []
  const hasMarkers = filteredMarkers.length > 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setShowTrades(s => !s)} style={{
          padding: '4px 12px', borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer',
          background: showTrades ? 'var(--green-bg)' : 'transparent',
          color: showTrades ? 'var(--green)' : 'var(--text-dim)',
          border: `1px solid ${showTrades ? 'var(--green-border)' : 'transparent'}`,
          transition: 'all 0.15s', marginRight: 8,
        }}>{showTrades ? 'Trades on' : 'Show trades'}</button>
        {ranges.map(r => (
          <button key={r.label} onClick={() => switchRange(r.label)} style={{
            padding: '4px 12px', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer',
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
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal stroke="#ffffff06" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={80} />
            <YAxis tick={{ fill: '#ffffff20', fontFamily: 'Fira Code', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 100000).toFixed(0)}L`} width={36} domain={['auto', 'auto']} />
            <Tooltip cursor={<CustomCursor />} content={<ChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#purpleGrad)" />
            {filtered[0]?.nifty > 0 && (
              <Line type="monotone" dataKey="nifty" stroke="#ffffff15" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            )}
            <Line
              type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2}
              dot={hasMarkers ? <TradeMarkerDot markers={filteredMarkers} /> : false}
              activeDot={{ r: 5, fill: '#818cf8', stroke: '#080810', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {filtered.some(d => d.drawdown != null && d.drawdown < 0) && (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8, marginBottom: 4 }}>Drawdown</div>
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
