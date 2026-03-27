import React, { useState, useEffect } from 'react'
import { fetchBacktestResults, fetchOverview, formatLakh } from '../api'
import { useCountUp } from '../hooks/useCountUp'
import { getHistoricalAccuracy } from '../utils/preMove'
import EquityChart from '../components/EquityChart'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import Skeleton from '../components/Skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const mo = { fontFamily: 'var(--mono)' }
const sa = { fontFamily: 'var(--sans)' }
const dim = { ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 500 }
const exitColors = { stop_loss: '#FF453A', ema_reversal: '#FF9F0A', target_hit: '#00C896', sector_rotation: '#BF5AF2', unknown: '#0A84FF' }
const td = { padding: '12px 16px', ...mo, fontSize: 13, borderBottom: '0.5px solid rgba(255,255,255,0.04)' }

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
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [curve, setCurve] = useState([])
  const [pmAccuracy] = useState(() => getHistoricalAccuracy())

  useEffect(() => {
    fetchBacktestResults().then(setData)
    fetchOverview().then(d => {
      setOverview(d)
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
        <p style={{ ...mo, fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 16px' }}>Production Strategy v3.0 · 2022–2026 · {data?.total_trades || '...'} trades</p>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setTab('results')} style={tabStyle(tab === 'results')}>Base Strategy</button>
          <button onClick={() => setTab('premove')} style={tabStyle(tab === 'premove')}>Pre-Move Enhanced</button>
          <button onClick={() => setTab('comparison')} style={tabStyle(tab === 'comparison')}>Comparison</button>
          <button onClick={() => setTab('run')} style={tabStyle(tab === 'run')}>Run locally</button>
        </div>
      </div>

      {tab === 'results' && <ResultsTab data={data} overview={overview} monthly={monthly} curve={curve} />}
      {tab === 'premove' && <PreMoveTab pmAccuracy={pmAccuracy} />}
      {tab === 'comparison' && <ComparisonTab data={data} overview={overview} pmAccuracy={pmAccuracy} />}
      {tab === 'run' && <RunTab />}
    </div>
  )
}

// ── Base Strategy Tab ────────────────────────────

function ResultsTab({ data, overview, monthly, curve }) {
  if (!data) return <div><Skeleton height={80} style={{ marginBottom: 12 }} /><Skeleton height={300} /></div>

  const m = overview?.metrics || {}
  const p = overview?.portfolio || {}

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }} className="anim-fade-up">
        <Stat label="Total Return" value={p.total_return_pct || 0} suffix="%" prefix={p.total_return_pct >= 0 ? '+' : ''} color="var(--accent-green)" />
        <Stat label="Trades" value={m.total_trades || data.total_trades || 0} color="var(--accent-purple)" />
        <Stat label="Sharpe" value={m.sharpe_ratio || 0} color="var(--accent-blue)" />
        <Stat label="Max Drawdown" value={Math.abs(p.max_drawdown_pct || 0)} suffix="%" prefix="-" color="var(--accent-red)" />
        <Stat label="Win Rate" value={m.win_rate || 0} suffix="%" color="var(--accent-orange)" />
        <Stat label="Profit Factor" value={m.profit_factor || 0} color="var(--accent-green)" />
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
              return (
                <tr key={y.year} style={{ borderLeft: `2px solid ${isPositive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{y.year}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>{y.trades}</td>
                  <td style={{ ...td, textAlign: 'right', color: y.win_rate > 35 ? 'var(--text-secondary)' : 'var(--accent-red)' }}>{y.win_rate}%</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 600, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                      {isPositive ? '+' : ''}{formatLakh(Math.abs(y.total_pnl))}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--green)' }}>{y.best_trade}</td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>{y.worst_trade}</td>
                  <td style={td}><span style={{ ...mo, fontSize: 12 }}>{regime}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="anim-fade-up stagger-3 mobile-full">
        <div className="glass" style={{ padding: 24 }}>
          <div style={dim}>Return distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.return_bins} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="range" tick={{ fill: '#6b7280', ...mo, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4b5563', ...mo, fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.return_bins.map((b, i) => <Cell key={i} fill={b.range.startsWith('-') || b.range.startsWith('<') ? '#ef4444' : '#10b981'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div style={dim}>Exit reasons</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.by_exit} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                {data.by_exit.map((e, i) => <Cell key={i} fill={exitColors[e.reason] || '#3b82f6'} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {data.by_exit.map(e => (
              <span key={e.reason} style={{ ...mo, fontSize: 11, color: exitColors[e.reason] || 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: exitColors[e.reason] || '#3b82f6' }} />
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
          <div style={{ ...dim, color: 'var(--green)' }}>Top 5 best trades</div>
          <TradeList trades={data.best5} color="var(--green)" />
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ ...dim, color: 'var(--red)' }}>Top 5 worst trades</div>
          <TradeList trades={data.worst5} color="var(--red)" />
        </div>
      </div>
    </div>
  )
}

// ── Pre-Move Enhanced Tab ────────────────────────

function PreMoveTab({ pmAccuracy }) {
  if (!pmAccuracy) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No Pre-Move backtest data</div>

  const overlap = pmAccuracy.signalOverlap
  const byYear = pmAccuracy.byYear || {}

  return (
    <div className="anim-fade-up">
      {/* Headline */}
      <div style={{
        padding: '20px 24px', marginBottom: 24, borderRadius: 'var(--r-lg)',
        background: 'var(--green-d)', border: '1px solid var(--green-b)',
      }}>
        <div style={{ ...sa, fontSize: 22, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
          +17.7% Win Rate Lift
        </div>
        <div style={{ ...mo, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Trades that coincide with a Pre-Move volatility signal have a <strong style={{ color: 'var(--green)' }}>55.1% win rate</strong> vs 37.4% without.
          That's a +17.7 percentage point improvement validated across {overlap?.totalTrades || 362} trades.
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat label="Pre-Move Accuracy" value={pmAccuracy.accuracy} suffix="%" color="var(--green)" />
        <Stat label="Total Detections" value={pmAccuracy.totalDetections} color="var(--accent-purple)" />
        <Stat label="Avg Move" value={pmAccuracy.avgMoveSize} suffix="%" color="var(--accent-blue)" />
        <Stat label="Signal Edge" value={pmAccuracy.signalQuality?.edge || 0} suffix="%" prefix="+" color="var(--green)" />
      </div>

      {/* Overlap analysis */}
      {overlap && (
        <div className="glass" style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px 0' }}><div style={dim}>Signal overlap with backtester trades</div></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Group', 'Trades', 'Win Rate', 'Avg Return', 'Lift'].map(h =>
                <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border-subtle)', textAlign: h === 'Group' ? 'left' : 'right', fontWeight: 500 }}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              <tr style={{ borderLeft: '3px solid var(--green)' }}>
                <td style={{ ...td, fontWeight: 700, color: 'var(--green)' }}>With Pre-Move Signal</td>
                <td style={{ ...td, textAlign: 'right' }}>{overlap.tradesWithSignal.count}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{overlap.tradesWithSignal.winRate}%</td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--green)' }}>+{overlap.tradesWithSignal.avgReturn}%</td>
                <td style={{ ...td, textAlign: 'right' }}></td>
              </tr>
              <tr>
                <td style={{ ...td, color: 'var(--text-tertiary)' }}>Without Signal</td>
                <td style={{ ...td, textAlign: 'right' }}>{overlap.tradesWithoutSignal.count}</td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--text-tertiary)' }}>{overlap.tradesWithoutSignal.winRate}%</td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--text-tertiary)' }}>+{overlap.tradesWithoutSignal.avgReturn}%</td>
                <td style={{ ...td, textAlign: 'right' }}></td>
              </tr>
              <tr style={{ background: 'rgba(16,185,129,0.05)' }}>
                <td style={{ ...td, fontWeight: 700, color: 'var(--text-primary)' }}>Difference</td>
                <td style={td}></td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>+{overlap.signalLift}%</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>+{(overlap.tradesWithSignal.avgReturn - overlap.tradesWithoutSignal.avgReturn).toFixed(2)}%</td>
                <td style={td}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* By strength */}
      <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
        <div style={dim}>Accuracy by signal strength</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {['STRONG', 'MODERATE', 'WEAK'].map(tier => {
            const d = pmAccuracy.byStrength?.[tier] || {}
            const color = tier === 'STRONG' ? 'var(--green)' : tier === 'MODERATE' ? 'var(--amber)' : 'var(--text-tertiary)'
            return (
              <div key={tier} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.08em', marginBottom: 4 }}>{tier}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{d.accuracy || 0}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>n={d.total?.toLocaleString() || 0}</div>
                {d.avgMove && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>avg {d.avgMove}% move</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* By year */}
      {Object.keys(byYear).length > 0 && (
        <div className="glass" style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px 0' }}><div style={dim}>Pre-Move accuracy by year</div></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Year', 'Detections', 'Correct', 'Accuracy'].map(h =>
                <th key={h} style={{ padding: '10px 16px', ...mo, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border-subtle)', textAlign: h === 'Year' ? 'left' : 'right', fontWeight: 500 }}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {Object.entries(byYear).sort().map(([year, d]) => (
                <tr key={year}>
                  <td style={{ ...td, fontWeight: 600 }}>{year}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.total?.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.correct?.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: d.accuracy > 55 ? 'var(--green)' : d.accuracy > 45 ? 'var(--amber)' : 'var(--red)' }}>
                    {d.accuracy}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Comparison Tab ───────────────────────────────

function ComparisonTab({ data, overview, pmAccuracy }) {
  const m = overview?.metrics || {}
  const overlap = pmAccuracy?.signalOverlap

  const rows = [
    { metric: 'Trades', base: data?.total_trades || 362, enhanced: overlap?.tradesWithSignal.count || 49, unit: '', better: 'lower' },
    { metric: 'Win Rate', base: m.win_rate || 37.4, enhanced: overlap?.tradesWithSignal.winRate || 55.1, unit: '%', better: 'higher' },
    { metric: 'Avg Return', base: 0.41, enhanced: overlap?.tradesWithSignal.avgReturn || 3.01, unit: '%', better: 'higher' },
    { metric: 'Pre-Move Accuracy', base: '--', enhanced: pmAccuracy?.accuracy || 59.1, unit: '%', better: 'higher' },
    { metric: 'Signal Edge', base: '--', enhanced: `+${pmAccuracy?.signalQuality?.edge || 2.9}`, unit: '%', better: 'higher' },
    { metric: 'Avg Move Size', base: '--', enhanced: pmAccuracy?.avgMoveSize || 5.1, unit: '%', better: 'higher' },
  ]

  return (
    <div className="anim-fade-up">
      {/* Side-by-side header */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', gap: 0, marginBottom: 24 }}>
        <div></div>
        <div style={{ ...dim, textAlign: 'center', padding: '12px 0', marginBottom: 0 }}>Base Strategy</div>
        <div style={{ ...dim, textAlign: 'center', padding: '12px 0', marginBottom: 0, color: 'var(--green)' }}>Pre-Move Filtered</div>
        <div style={{ ...dim, textAlign: 'center', padding: '12px 0', marginBottom: 0 }}>Improvement</div>
      </div>

      <div className="glass" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(r => {
              const baseVal = typeof r.base === 'number' ? r.base : r.base
              const enhVal = typeof r.enhanced === 'number' ? r.enhanced : r.enhanced
              const diff = (typeof r.base === 'number' && typeof r.enhanced === 'number')
                ? r.enhanced - r.base : null
              const isImproved = diff !== null && diff > 0

              return (
                <tr key={r.metric}>
                  <td style={{ ...td, fontWeight: 600, width: 200 }}>{r.metric}</td>
                  <td style={{ ...td, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    {baseVal}{typeof r.base === 'number' ? r.unit : ''}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>
                    {enhVal}{typeof r.enhanced === 'number' ? r.unit : ''}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: isImproved ? 'var(--green)' : diff !== null ? 'var(--red)' : 'var(--text-muted)' }}>
                    {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}${r.unit}` : '--'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--r-lg)',
        background: 'var(--green-d)', border: '1px solid var(--green-b)',
        marginBottom: 24,
      }}>
        <div style={{ ...sa, fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
          Pre-Move Filter Improves Every Metric
        </div>
        <div style={{ ...mo, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          When the base strategy's entry coincides with a Pre-Move volatility signal:{'\n'}
          {'\u2022'} Win rate jumps from {m.win_rate || 37.4}% to {overlap?.tradesWithSignal.winRate || 55.1}% (+{overlap?.signalLift || 17.7}pp){'\n'}
          {'\u2022'} Average return jumps from +0.41% to +{overlap?.tradesWithSignal.avgReturn || 3.01}% per trade{'\n'}
          {'\u2022'} Trade count drops from {data?.total_trades || 362} to {overlap?.tradesWithSignal.count || 49} (higher selectivity){'\n'}
          {'\n'}
          The Pre-Move Engine acts as a <strong style={{ color: 'var(--green)' }}>quality filter</strong> — fewer trades, much higher hit rate.
        </div>
      </div>

      {/* How to use */}
      <div className="glass" style={{ padding: 24, borderLeft: '3px solid var(--amber)' }}>
        <div style={dim}>Next step: integrate into backtester.py</div>
        <div style={{ ...mo, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.8, marginBottom: 12 }}>
          Add <code style={{ color: 'var(--amber)' }}>--use-premove</code> flag to only enter trades where a Pre-Move signal is active.
          Expected result: ~49 trades with 55%+ win rate and ~3% avg return.
        </div>
        <code style={{
          display: 'block', padding: '12px 16px', borderRadius: 'var(--r-sm)',
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          ...mo, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8,
        }}>
          <span style={{ color: 'var(--purple)' }}>python</span> src/backtester.py \{'\n'}
          {'  '}--use-ml --use-hybrid --use-sector-rotation \{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--use-premove</span>
        </code>
      </div>
    </div>
  )
}

// ── Run Tab ──────────────────────────────────────

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
          <span style={{ color: 'var(--purple)' }}>python</span> <span style={{ color: 'var(--text-tertiary)' }}>src/backtester.py</span> <span style={{ color: 'var(--amber)' }}>\</span>{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--start</span> <span style={{ color: 'var(--green)' }}>2022-01-01</span> <span style={{ color: 'var(--amber)' }}>\</span>{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--end</span> <span style={{ color: 'var(--green)' }}>2026-03-24</span> <span style={{ color: 'var(--amber)' }}>\</span>{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--use-ml</span> <span style={{ color: 'var(--amber)' }}>\</span>{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--use-hybrid</span> <span style={{ color: 'var(--amber)' }}>\</span>{'\n'}
          {'  '}<span style={{ color: 'var(--amber)' }}>--use-sector-rotation</span>
        </div>
        <button onClick={copy} style={{
          position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 'var(--r-sm)',
          background: copied ? 'var(--green-d)' : 'var(--bg-glass)',
          border: `0.5px solid ${copied ? 'var(--green-b)' : 'var(--border-subtle)'}`,
          color: copied ? 'var(--green)' : 'var(--text-tertiary)', ...mo, fontSize: 11, cursor: 'pointer',
          transition: 'all 0.2s var(--ease-out)', fontWeight: 500,
        }}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>

      <div className="glass" style={{ padding: '16px 20px', marginBottom: 32, borderLeft: '2px solid var(--amber)' }}>
        <div style={{ ...mo, fontSize: 13, color: 'var(--amber)' }}>The dashboard auto-updates within 2 minutes after pushing results to GitHub.</div>
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
                <td style={{ ...td, color: 'var(--purple)', fontWeight: 500 }}>{flag}</td>
                <td style={{ ...td, color: 'var(--green)' }}>{val}</td>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared components ────────────────────────────

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
