import React, { useState, useEffect } from 'react'
import { fetchBacktestResults, fetchOverview, formatLakh } from '../api'
import { useCountUp } from '../hooks/useCountUp'
import EquityChart from '../components/EquityChart'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import Skeleton from '../components/Skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const mo = { fontFamily: 'var(--mono)' }
const sa = { fontFamily: 'var(--sans)' }
const dim = { ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 500 }
const exitColors = { stop_loss: '#FF453A', ema_reversal: '#FF9F0A', target_hit: '#00C896', sector_rotation: '#BF5AF2', unknown: '#0A84FF' }

function Stat({ label, value, suffix = '', prefix = '', color = 'var(--accent-purple)' }) {
  const num = typeof value === 'number' ? value : 0
  const anim = useCountUp(num, 1000)
  const display = typeof value === 'string' ? value : (Math.abs(num) >= 100 ? Math.round(anim) : anim.toFixed(1))
  return (
    <div className="glass" style={{ padding: '20px 16px', flex: 1, minWidth: 120 }}>
      <div style={dim}>{label}</div>
      <div className="tabular" style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 600, color, letterSpacing: '-0.02em' }}>{prefix}{display}{suffix}</div>
    </div>
  )
}

export default function Backtest() {
  const [tab, setTab] = useState('results')
  const [data, setData] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [curve, setCurve] = useState([])

  useEffect(() => {
    fetchBacktestResults().then(setData)
    fetchOverview().then(d => {
      setMonthly(d.monthlyReturns || [])
      setCurve(d.equity_curve || [])
    })
  }, [])

  const tabStyle = (active) => ({
    padding: '8px 20px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
    ...mo, fontSize: 13, fontWeight: 500, border: 'none',
    background: active ? 'var(--bg-glass)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
    borderBottom: active ? '2px solid var(--accent-green)' : '2px solid transparent',
    transition: 'all 0.2s var(--ease-out)',
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...sa, fontSize: 32, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>Strategy backtester</h1>
        <p style={{ ...mo, fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 16px' }}>Production Strategy v3.0 · 2022–2026 · 362 trades</p>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setTab('results')} style={tabStyle(tab === 'results')}>Results</button>
          <button onClick={() => setTab('run')} style={tabStyle(tab === 'run')}>Run locally</button>
        </div>
      </div>

      {tab === 'results' ? <ResultsTab data={data} monthly={monthly} curve={curve} /> : <RunTab />}
    </div>
  )
}

function ResultsTab({ data, monthly, curve }) {
  if (!data) return <div><Skeleton height={80} style={{ marginBottom: 12 }} /><Skeleton height={300} /></div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }} className="anim-fade-up">
        <Stat label="Total Return" value={43.2} suffix="%" prefix="+" color="var(--accent-green)" />
        <Stat label="Annualised" value={9.1} suffix="%" prefix="+" color="var(--accent-purple)" />
        <Stat label="Sharpe" value={0.67} color="var(--accent-blue)" />
        <Stat label="Max Drawdown" value={24.1} suffix="%" prefix="-" color="var(--accent-red)" />
        <Stat label="Win Rate" value={39.8} suffix="%" color="var(--accent-orange)" />
        <Stat label="Profit Factor" value={1.19} color="var(--accent-green)" />
      </div>

      <div className="glass lift anim-fade-up stagger-1" style={{ padding: 24, marginBottom: 24 }}>
        <div style={dim}>Strategy vs benchmark</div>
        {curve.length > 0 ? <EquityChart data={curve} height={240} /> : <div style={{ ...mo, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No equity data</div>}
      </div>

      <div className="glass anim-fade-up stagger-2" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '18px 24px 0' }}><div style={dim}>Annual performance breakdown</div></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Year', 'Trades', 'Win Rate', 'Return', 'Best Trade', 'Worst Trade', 'Regime'].map(h =>
              <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border-subtle)', textAlign: h === 'Year' || h === 'Regime' ? 'left' : 'right', fontWeight: 500 }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {data.yearly.map(y => {
              const isPositive = y.total_pnl >= 0
              const regime = y.year === 2023 ? 'BULL' : y.year === 2025 ? 'BEAR' : y.year === 2024 ? 'Choppy' : 'Mixed'
              const isBest = y.year === 2023
              const isBear = y.year === 2025
              return (
                <tr key={y.year} style={{ borderLeft: `2px solid ${isPositive ? 'rgba(0,200,150,0.3)' : 'rgba(255,69,58,0.3)'}` }}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{y.year}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>{y.trades}</td>
                  <td style={{ ...td, textAlign: 'right', color: y.win_rate > 35 ? 'var(--text-secondary)' : 'var(--accent-red)' }}>{y.win_rate}%</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 600, color: isPositive ? '#00C896' : '#FF453A' }}>
                      {isPositive ? '+' : ''}{formatLakh(Math.abs(y.total_pnl))}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#00C896' }}>{y.best_trade}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#FF453A' }}>{y.worst_trade}</td>
                  <td style={td}>
                    <span style={{ ...mo, fontSize: 12 }}>{regime}</span>
                    {isBest && <span style={{ marginLeft: 6, ...mo, fontSize: 9, padding: '2px 6px', borderRadius: 10, background: 'rgba(0,200,150,0.1)', color: '#00C896', border: '0.5px solid rgba(0,200,150,0.2)', fontWeight: 500 }}>Best year</span>}
                    {isBear && <span style={{ marginLeft: 6, ...mo, fontSize: 9, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: '0.5px solid rgba(255,69,58,0.2)', fontWeight: 500 }}>Bear market</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ margin: '16px 24px 20px', padding: '14px 18px', background: 'rgba(255,159,10,0.04)', border: '0.5px solid rgba(255,159,10,0.12)', borderRadius: 12 }}>
          <div style={{ ...mo, fontSize: 13, color: '#FF9F0A', lineHeight: 1.5 }}>
            In 3 non-bear years (2022–2024), strategy averaged +25.8% annually with consistent 39–41% win rates.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="anim-fade-up stagger-3 mobile-full">
        <div className="glass" style={{ padding: 24 }}>
          <div style={dim}>Return distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.return_bins} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="range" tick={{ fill: '#6e6e73', ...mo, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#48484a', ...mo, fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.return_bins.map((b, i) => <Cell key={i} fill={b.range.startsWith('-') || b.range.startsWith('<') ? '#FF453A' : '#00C896'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div style={dim}>Exit reasons</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.by_exit} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                {data.by_exit.map((e, i) => <Cell key={i} fill={exitColors[e.reason] || '#0A84FF'} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {data.by_exit.map(e => (
              <span key={e.reason} style={{ ...mo, fontSize: 11, color: exitColors[e.reason] || 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: exitColors[e.reason] || '#0A84FF' }} />
                {e.reason.replace(/_/g, ' ')} ({e.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass anim-fade-up stagger-4" style={{ padding: '20px 18px 16px', marginBottom: 24 }}>
        <div style={dim}>Monthly returns</div>
        <MonthlyHeatmap data={monthly} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="mobile-full">
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ ...dim, color: '#00C896' }}>Top 5 best trades</div>
          <TradeList trades={data.best5} color="#00C896" />
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ ...dim, color: '#FF453A' }}>Top 5 worst trades</div>
          <TradeList trades={data.worst5} color="#FF453A" />
        </div>
      </div>
    </div>
  )
}

function RunTab() {
  const [copied, setCopied] = useState(false)
  const cmd = `python src/backtester.py \\
  --start 2022-01-01 \\
  --end 2026-03-24 \\
  --use-ml \\
  --use-hybrid \\
  --use-sector-rotation`

  const copy = () => {
    navigator.clipboard.writeText(cmd.replace(/\\\n\s+/g, ' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const params = [
    ['--adx-threshold', '22', 'Minimum ADX for entry'],
    ['--rsi-dip-level', '45', 'RSI dip threshold'],
    ['--atr-stop-mult', '1.5', 'Stop loss multiplier'],
    ['--atr-target-mult', '3.0', 'Target multiplier'],
    ['--min-hold-days', '8', 'Minimum holding period'],
    ['--ml-threshold-bull', '0.50', 'ML score for bull regime'],
    ['--ml-threshold-choppy', '0.54', 'ML score for choppy'],
    ['--risk-per-trade', '1.5%', 'Portfolio risk per trade'],
  ]

  return (
    <div className="anim-fade-up" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ ...sa, fontSize: 22, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.02em' }}>Run a fresh backtest</h2>
        <p style={{ ...mo, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Backtesting requires your local engine with Python, market data, and trained ML model. Run this in your terminal:
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{
          background: 'var(--bg-card)', border: '0.5px solid var(--border-subtle)', borderRadius: 16,
          padding: '20px 24px', ...mo, fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap', overflowX: 'auto',
        }}>
          <span style={{ color: '#BF5AF2' }}>python</span> <span style={{ color: 'var(--text-tertiary)' }}>src/backtester.py</span> <span style={{ color: '#FF9F0A' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#FF9F0A' }}>--start</span> <span style={{ color: '#00C896' }}>2022-01-01</span> <span style={{ color: '#FF9F0A' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#FF9F0A' }}>--end</span> <span style={{ color: '#00C896' }}>2026-03-24</span> <span style={{ color: '#FF9F0A' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#FF9F0A' }}>--use-ml</span> <span style={{ color: '#FF9F0A' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#FF9F0A' }}>--use-hybrid</span> <span style={{ color: '#FF9F0A' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#FF9F0A' }}>--use-sector-rotation</span>
        </div>
        <button onClick={copy} style={{
          position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 'var(--r-sm)',
          background: copied ? 'rgba(0,200,150,0.12)' : 'var(--bg-glass)',
          border: `0.5px solid ${copied ? 'rgba(0,200,150,0.25)' : 'var(--border-subtle)'}`,
          color: copied ? '#00C896' : 'var(--text-tertiary)', ...mo, fontSize: 11, cursor: 'pointer',
          transition: 'all 0.2s var(--ease-out)', fontWeight: 500,
        }}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>

      <div style={{ ...mo, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.8 }}>
        After running, push results to update the dashboard:
      </div>
      <div style={{
        background: 'var(--bg-card)', border: '0.5px solid var(--border-subtle)', borderRadius: 16,
        padding: '16px 24px', ...mo, fontSize: 13, lineHeight: 1.8, color: 'var(--text-tertiary)',
        marginBottom: 32,
      }}>
        <span style={{ color: '#BF5AF2' }}>git add</span> results/{'\n'}
        <span style={{ color: '#BF5AF2' }}>git commit</span> -m <span style={{ color: '#00C896' }}>"backtest update"</span>{'\n'}
        <span style={{ color: '#BF5AF2' }}>git push</span>
      </div>

      <div className="glass" style={{ padding: '16px 20px', marginBottom: 32, borderLeft: '2px solid var(--accent-orange)' }}>
        <div style={{ ...mo, fontSize: 13, color: '#FF9F0A' }}>The dashboard auto-updates within 2 minutes after pushing results to GitHub.</div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 0' }}><div style={dim}>Parameter reference (production v3.0)</div></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Flag', 'Value', 'Description'].map(h =>
              <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border-subtle)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {params.map(([flag, val, desc]) => (
              <tr key={flag}>
                <td style={{ ...td, color: '#BF5AF2', fontWeight: 500 }}>{flag}</td>
                <td style={{ ...td, color: '#00C896' }}>{val}</td>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TradeList({ trades, color }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Ticker', 'Return', 'P&L', 'Days', 'Exit'].map(h =>
          <th key={h} style={{ padding: '6px 8px', ...mo, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border-subtle)', textAlign: h === 'Ticker' || h === 'Exit' ? 'left' : 'right', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i}>
            <td style={{ padding: '8px', ...mo, fontSize: 13, fontWeight: 600 }}>{t.ticker}</td>
            <td style={{ padding: '8px', ...mo, fontSize: 13, textAlign: 'right', color, fontWeight: 600 }}>{t.return_pct >= 0 ? '+' : ''}{t.return_pct}%</td>
            <td style={{ padding: '8px', ...mo, fontSize: 12, textAlign: 'right', color: 'var(--text-tertiary)' }}>{t.net_pnl?.toLocaleString('en-IN')}</td>
            <td style={{ padding: '8px', ...mo, fontSize: 12, textAlign: 'right', color: 'var(--text-tertiary)' }}>{t.hold_days}d</td>
            <td style={{ padding: '8px', ...mo, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.exit_reason?.replace(/_/g, ' ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '8px 12px', ...mo, fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
    <div style={{ color: 'var(--text-tertiary)' }}>{label || payload[0]?.payload?.range || ''}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
  </div>
}

const td = { padding: '12px 16px', ...mo, fontSize: 13, borderBottom: '0.5px solid rgba(255,255,255,0.04)' }
const mo2 = mo
