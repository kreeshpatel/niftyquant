import React, { useState, useEffect } from 'react'
import { fetchBacktestResults, fetchOverview, formatLakh } from '../api'
import { useCountUp } from '../hooks/useCountUp'
import EquityChart from '../components/EquityChart'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import Skeleton from '../components/Skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const mo = { fontFamily: 'var(--mono)' }
const sa = { fontFamily: 'var(--sans)' }
const dim = { ...mo, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', marginBottom: 12 }
const exitColors = { stop_loss: '#f87171', ema_reversal: '#fbbf24', target_hit: '#34d399', sector_rotation: '#818cf8', unknown: '#60a5fa' }

function Stat({ label, value, suffix = '', prefix = '', color = 'var(--purple)' }) {
  const num = typeof value === 'number' ? value : 0
  const anim = useCountUp(num, 1000)
  const display = typeof value === 'string' ? value : (Math.abs(num) >= 100 ? Math.round(anim) : anim.toFixed(1))
  return (
    <div className="glass" style={{ padding: '20px 16px', flex: 1, minWidth: 120 }}>
      <div style={dim}>{label}</div>
      <div className="tabular" style={{ ...mo, fontSize: 26, fontWeight: 500, color }}>{prefix}{display}{suffix}</div>
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
    ...mo, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, border: 'none',
    background: active ? 'var(--bg-active)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    borderBottom: active ? '2px solid var(--purple)' : '2px solid transparent',
    transition: 'all 0.2s',
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...sa, fontSize: 32, fontWeight: 800, margin: 0 }}>Strategy backtester</h1>
        <p style={{ ...mo, fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 16px' }}>Production Strategy v3.0 · 2022–2026 · 362 trades</p>
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
      {/* Hero metrics */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }} className="anim-fade-up">
        <Stat label="Total Return" value={43.2} suffix="%" prefix="+" color="var(--green)" />
        <Stat label="Annualised" value={9.1} suffix="%" prefix="+" color="var(--purple)" />
        <Stat label="Sharpe" value={0.67} color="var(--blue)" />
        <Stat label="Max Drawdown" value={24.1} suffix="%" prefix="-" color="var(--red)" />
        <Stat label="Win Rate" value={39.8} suffix="%" color="var(--amber)" />
        <Stat label="Profit Factor" value={1.19} color="var(--green)" />
      </div>

      {/* Equity chart */}
      <div className="glass lift anim-fade-up stagger-1" style={{ padding: 20, marginBottom: 24 }}>
        <div style={dim}>Strategy vs benchmark</div>
        {curve.length > 0 ? <EquityChart data={curve} height={240} /> : <div style={{ ...mo, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 40 }}>No equity data</div>}
      </div>

      {/* Year by year */}
      <div className="glass anim-fade-up stagger-2" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '18px 20px 0' }}><div style={dim}>Annual performance breakdown</div></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Year', 'Trades', 'Win Rate', 'Return', 'Best Trade', 'Worst Trade', 'Regime'].map(h =>
              <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: h === 'Year' || h === 'Regime' ? 'left' : 'right' }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {data.yearly.map(y => {
              const isPositive = y.total_pnl >= 0
              const regime = y.year === 2023 ? 'BULL' : y.year === 2025 ? 'BEAR' : y.year === 2024 ? 'Choppy' : 'Mixed'
              const isBest = y.year === 2023
              const isBear = y.year === 2025
              return (
                <tr key={y.year} style={{ borderLeft: `3px solid ${isPositive ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}` }}>
                  <td style={td}><span style={{ fontWeight: 700 }}>{y.year}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>{y.trades}</td>
                  <td style={{ ...td, textAlign: 'right', color: y.win_rate > 35 ? 'rgba(255,255,255,0.7)' : '#f87171' }}>{y.win_rate}%</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ ...mo, fontSize: 16, fontWeight: 700, color: isPositive ? '#34d399' : '#f87171' }}>
                      {isPositive ? '+' : ''}{formatLakh(Math.abs(y.total_pnl))}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#34d399' }}>{y.best_trade}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#f87171' }}>{y.worst_trade}</td>
                  <td style={td}>
                    <span style={{ ...mo, fontSize: 11 }}>{regime}</span>
                    {isBest && <span style={{ marginLeft: 6, ...mo, fontSize: 8, padding: '2px 6px', borderRadius: 10, background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>Best year</span>}
                    {isBear && <span style={{ marginLeft: 6, ...mo, fontSize: 8, padding: '2px 6px', borderRadius: 10, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>Bear market</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Insight card */}
        <div style={{ margin: '16px 20px 20px', padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 'var(--r-md)' }}>
          <div style={{ ...mo, fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
            In 3 non-bear years (2022–2024), strategy averaged +25.8% annually with consistent 39–41% win rates.
          </div>
        </div>
      </div>

      {/* Distribution + Exit reasons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="anim-fade-up stagger-3 mobile-full">
        <div className="glass" style={{ padding: 20 }}>
          <div style={dim}>Return distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.return_bins} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.15)', ...mo, fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.1)', ...mo, fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.return_bins.map((b, i) => <Cell key={i} fill={b.range.startsWith('-') || b.range.startsWith('<') ? '#f87171' : '#34d399'} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <div style={dim}>Exit reasons</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.by_exit} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {data.by_exit.map((e, i) => <Cell key={i} fill={exitColors[e.reason] || '#60a5fa'} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {data.by_exit.map(e => (
              <span key={e.reason} style={{ ...mo, fontSize: 10, color: exitColors[e.reason] || 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: exitColors[e.reason] || '#60a5fa' }} />
                {e.reason.replace(/_/g, ' ')} ({e.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly heatmap */}
      <div className="glass anim-fade-up stagger-4" style={{ padding: '16px 16px 12px', marginBottom: 24 }}>
        <div style={dim}>Monthly returns</div>
        <MonthlyHeatmap data={monthly} />
      </div>

      {/* Best / Worst trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="mobile-full">
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ ...dim, color: '#34d399' }}>Top 5 best trades</div>
          <TradeList trades={data.best5} color="#34d399" />
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ ...dim, color: '#f87171' }}>Top 5 worst trades</div>
          <TradeList trades={data.worst5} color="#f87171" />
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
        <h2 style={{ ...sa, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Run a fresh backtest</h2>
        <p style={{ ...mo, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
          Backtesting requires your local engine with Python, market data, and trained ML model. Run this in your terminal:
        </p>
      </div>

      {/* Code block */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{
          background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-lg)',
          padding: '20px 24px', ...mo, fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)',
          whiteSpace: 'pre-wrap', overflowX: 'auto',
        }}>
          <span style={{ color: '#818cf8' }}>python</span> <span style={{ color: 'rgba(255,255,255,0.5)' }}>src/backtester.py</span> <span style={{ color: '#fbbf24' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#fbbf24' }}>--start</span> <span style={{ color: '#34d399' }}>2022-01-01</span> <span style={{ color: '#fbbf24' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#fbbf24' }}>--end</span> <span style={{ color: '#34d399' }}>2026-03-24</span> <span style={{ color: '#fbbf24' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#fbbf24' }}>--use-ml</span> <span style={{ color: '#fbbf24' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#fbbf24' }}>--use-hybrid</span> <span style={{ color: '#fbbf24' }}>\</span>{'\n'}
          {'  '}<span style={{ color: '#fbbf24' }}>--use-sector-rotation</span>
        </div>
        <button onClick={copy} style={{
          position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 'var(--r-sm)',
          background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: copied ? '#34d399' : 'rgba(255,255,255,0.4)', ...mo, fontSize: 10, cursor: 'pointer',
          transition: 'all 0.2s',
        }}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>

      {/* After running */}
      <div style={{ ...mo, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24, lineHeight: 1.8 }}>
        After running, push results to update the dashboard:
      </div>
      <div style={{
        background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-lg)',
        padding: '16px 24px', ...mo, fontSize: 12, lineHeight: 1.8, color: 'rgba(255,255,255,0.5)',
        marginBottom: 32,
      }}>
        <span style={{ color: '#818cf8' }}>git add</span> results/{'\n'}
        <span style={{ color: '#818cf8' }}>git commit</span> -m <span style={{ color: '#34d399' }}>"backtest update"</span>{'\n'}
        <span style={{ color: '#818cf8' }}>git push</span>
      </div>

      {/* Note */}
      <div className="glass" style={{ padding: '16px 20px', marginBottom: 32, borderLeft: '3px solid var(--amber)' }}>
        <div style={{ ...mo, fontSize: 12, color: '#fbbf24' }}>The dashboard auto-updates within 2 minutes after pushing results to GitHub.</div>
      </div>

      {/* Parameter reference */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 0' }}><div style={dim}>Parameter reference (production v3.0)</div></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Flag', 'Value', 'Description'].map(h =>
              <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {params.map(([flag, val, desc]) => (
              <tr key={flag}>
                <td style={{ ...td, color: '#818cf8', fontWeight: 500 }}>{flag}</td>
                <td style={{ ...td, color: '#34d399' }}>{val}</td>
                <td style={{ ...td, color: 'rgba(255,255,255,0.35)' }}>{desc}</td>
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
          <th key={h} style={{ padding: '6px 8px', ...mo, fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: h === 'Ticker' || h === 'Exit' ? 'left' : 'right', letterSpacing: 1 }}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i}>
            <td style={{ padding: '8px', ...mo, fontSize: 12, fontWeight: 600 }}>{t.ticker}</td>
            <td style={{ padding: '8px', ...mo, fontSize: 12, textAlign: 'right', color, fontWeight: 700 }}>{t.return_pct >= 0 ? '+' : ''}{t.return_pct}%</td>
            <td style={{ padding: '8px', ...mo, fontSize: 11, textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>{t.net_pnl?.toLocaleString('en-IN')}</td>
            <td style={{ padding: '8px', ...mo, fontSize: 11, textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>{t.hold_days}d</td>
            <td style={{ padding: '8px', ...mo, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{t.exit_reason?.replace(/_/g, ' ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 12px', ...mo, fontSize: 11 }}>
    <div style={{ color: 'rgba(255,255,255,0.3)' }}>{label || payload[0]?.payload?.range || ''}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
  </div>
}

const td = { padding: '12px 16px', ...mo, fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }
const mo2 = mo
