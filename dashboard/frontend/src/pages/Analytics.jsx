import React, { useEffect, useState } from 'react'
import { fetchAnalytics, fetchOverview, formatLakh } from '../api'
import { useCountUp } from '../hooks/useCountUp'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, PieChart, Pie } from 'recharts'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import Skeleton from '../components/Skeleton'

const mono = { fontFamily: 'var(--font-mono)' }
const dim = { ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 12 }

function Stat({ label, value, color = 'var(--purple)', suffix = '' }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  const display = typeof value === 'number' ? (Math.abs(value) >= 100 ? Math.round(animated) : animated.toFixed(1)) : value
  return (
    <div className="glass" style={{ padding: '20px 18px', flex: 1, minWidth: 140 }}>
      <div style={dim}>{label}</div>
      <div style={{ ...mono, fontSize: 28, fontWeight: 500, color }}>{display}{suffix}</div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div style={{ background: '#111113', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', ...mono, fontSize: 11 }}>
    <div style={{ color: 'var(--text-dim)' }}>{label || payload[0]?.payload?.range || ''}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
  </div>
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [monthly, setMonthly] = useState([])
  useEffect(() => {
    fetchAnalytics().then(setData)
    fetchOverview().then(d => setMonthly(d.monthlyReturns || []))
  }, [])

  if (!data) return <div className="page-enter"><Skeleton height={80} style={{ marginBottom: 12 }} /><Skeleton height={300} /></div>

  const d = data
  const exitColors = { stop_loss: '#f87171', ema_reversal: '#fbbf24', target_hit: '#34d399', unknown: '#60a5fa' }

  return (
    <div className="page-enter">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: '0 0 20px' }}>Portfolio analytics</h1>

      {/* Section 1: Hero stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }} className="stagger-1">
        <Stat label="Total P&L" value={d.total_pnl} color={d.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Stat label="Win Rate" value={d.win_rate} color="var(--green)" suffix="%" />
        <Stat label="Profit Factor" value={d.profit_factor} color="var(--purple)" />
        <Stat label="Avg Win" value={d.avg_win} color="var(--green)" suffix="%" />
        <Stat label="Avg Loss" value={d.avg_loss} color="var(--red)" suffix="%" />
        <Stat label="Avg Hold" value={d.avg_hold_days} color="var(--text-primary)" suffix="d" />
      </div>

      {/* Section 2: Distribution + Exit breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="stagger-2 mobile-full">
        <div className="glass" style={{ padding: 20 }}>
          <div style={dim}>Trade return distribution</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{d.total_trades} trades</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.return_bins} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="range" tick={{ fill: '#ffffff20', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#ffffff15', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {d.return_bins.map((b, i) => <Cell key={i} fill={b.range.startsWith('-') || b.range.startsWith('<') ? '#f87171' : '#34d399'} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass" style={{ padding: 20 }}>
          <div style={dim}>Exit reason breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={d.by_exit} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {d.by_exit.map((e, i) => <Cell key={i} fill={exitColors[e.reason] || '#60a5fa'} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {d.by_exit.map(e => (
              <span key={e.reason} style={{ ...mono, fontSize: 10, color: exitColors[e.reason] || 'var(--text-dim)' }}>
                {e.reason.replace('_', ' ')} ({e.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Sector performance */}
      <div className="glass stagger-3" style={{ padding: 20, marginBottom: 24 }}>
        <div style={dim}>Performance by sector</div>
        <ResponsiveContainer width="100%" height={Math.max(d.by_sector.length * 32, 120)}>
          <BarChart data={d.by_sector} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <XAxis type="number" tick={{ fill: '#ffffff15', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="sector" tick={{ fill: '#ffffff40', ...mono, fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="trades" name="Trades" radius={[0, 4, 4, 0]} barSize={14}>
              {d.by_sector.map((s, i) => <Cell key={i} fill={s.win_rate > 40 ? '#a78bfaB3' : s.win_rate < 30 ? '#f87171B3' : '#fbbf24B3'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section 4: Rolling performance */}
      <div className="glass stagger-4" style={{ padding: 20, marginBottom: 24 }}>
        <div style={dim}>Cumulative P&L vs rolling win rate</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={d.rolling} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid horizontal stroke="#ffffff06" vertical={false} />
            <XAxis dataKey="idx" tick={{ fill: '#ffffff15', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="pnl" tick={{ fill: '#ffffff15', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <YAxis yAxisId="wr" orientation="right" tick={{ fill: '#ffffff15', ...mono, fontSize: 9 }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Line yAxisId="pnl" dataKey="cumulative_pnl" name="Cum P&L" stroke="#a78bfa" strokeWidth={2} dot={false} />
            <Line yAxisId="wr" dataKey="winrate_20" name="Win Rate 20" stroke="#34d399" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 5: Streaks */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="glass" style={{ padding: '14px 18px', flex: 1, minWidth: 140 }}>
          <div style={dim}>Current streak</div>
          <div style={{ ...mono, fontSize: 20, fontWeight: 500, color: d.current_streak_type === 'win' ? 'var(--green)' : 'var(--red)' }}>{d.current_streak} {d.current_streak_type}s</div>
        </div>
        <div className="glass" style={{ padding: '14px 18px', flex: 1, minWidth: 140 }}>
          <div style={dim}>Best win streak</div>
          <div style={{ ...mono, fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>{d.longest_win_streak} trades</div>
        </div>
        <div className="glass" style={{ padding: '14px 18px', flex: 1, minWidth: 140 }}>
          <div style={dim}>Worst loss streak</div>
          <div style={{ ...mono, fontSize: 20, fontWeight: 500, color: 'var(--red)' }}>{d.longest_loss_streak} trades</div>
        </div>
        <div className="glass" style={{ padding: '14px 18px', flex: 1, minWidth: 140 }}>
          <div style={dim}>Best trade</div>
          <div style={{ ...mono, fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>+{d.best_trade}%</div>
        </div>
      </div>

      {/* Section 6: Monthly heatmap */}
      <div className="glass" style={{ padding: '16px 16px 12px', marginBottom: 24 }}>
        <div style={dim}>Monthly returns</div>
        <MonthlyHeatmap data={monthly} />
      </div>

      {/* Section 7: Best/worst trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="mobile-full">
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ ...dim, color: 'var(--green)' }}>Top 5 best trades</div>
          <MiniTable trades={d.best5} color="var(--green)" />
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ ...dim, color: 'var(--red)' }}>Top 5 worst trades</div>
          <MiniTable trades={d.worst5} color="var(--red)" />
        </div>
      </div>
    </div>
  )
}

function MiniTable({ trades, color }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Ticker', 'Return', 'P&L', 'Days', 'Exit'].map(h => <th key={h} style={{ padding: '6px 8px', ...mono, fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', textAlign: h === 'Ticker' || h === 'Exit' ? 'left' : 'right', letterSpacing: 1 }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i}>
            <td style={{ padding: '8px', ...mono, fontSize: 12, fontWeight: 600 }}>{t.ticker}</td>
            <td style={{ padding: '8px', ...mono, fontSize: 12, textAlign: 'right', color, fontWeight: 700 }}>{t.return_pct >= 0 ? '+' : ''}{t.return_pct}%</td>
            <td style={{ padding: '8px', ...mono, fontSize: 11, textAlign: 'right', color: 'var(--text-dim)' }}>{t.net_pnl?.toLocaleString('en-IN')}</td>
            <td style={{ padding: '8px', ...mono, fontSize: 11, textAlign: 'right', color: 'var(--text-dim)' }}>{t.hold_days}d</td>
            <td style={{ padding: '8px', ...mono, fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{t.exit_reason?.replace('_', ' ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
