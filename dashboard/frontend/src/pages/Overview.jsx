import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, formatLakh } from '../api'
import MetricHero from '../components/MetricHero'
import EquityChart from '../components/EquityChart'
import EngineStatus from '../components/EngineStatus'
import RegimeCard from '../components/RegimeCard'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import SectorChart from '../components/SectorChart'

function useAnimatedNumber(target, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const start = performance.now()
    const from = 0
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])
  return display
}

export default function Overview() {
  const [data, setData] = useState(null)
  useEffect(() => { fetchOverview().then(setData) }, [])

  const p = data?.portfolio || {}
  const m = data?.metrics || {}
  const curve = data?.equity_curve || []
  const markers = data?.tradeMarkers || []
  const monthly = data?.monthlyReturns || []
  const sectors = data?.sectorPerf || []
  const ret = p.total_return_pct || 0
  const wins = Math.round((m.win_rate || 0) / 100 * (m.total_trades || 0))
  const losses = (m.total_trades || 0) - wins
  const animatedValue = useAnimatedNumber(p.total_value || 0)

  return (
    <div>
      {/* Hero metrics */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', overflow: 'hidden' }} className="fade-up fade-up-1 mobile-stack">
        <MetricHero
          label="Portfolio Value"
          value={formatLakh(animatedValue || 1000000)}
          sub={<span style={{ color: ret >= 0 ? 'var(--green)' : 'var(--red)' }}>{ret >= 0 ? '+' : ''}{ret.toFixed(1)}% since inception</span>}
          color="var(--purple)" glowColor="#a78bfa"
        />
        <MetricHero
          label="Profit Factor / Win Rate"
          value={<><span style={{ color: 'var(--green)' }}>{(m.profit_factor || 0).toFixed(2)}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span>{m.win_rate || 0}%</span></>}
          sub={`${wins}W · ${losses}L · ${m.total_trades || 0} trades`}
          color="var(--text-primary)" glowColor="#34d399"
        />
        <MetricHero
          label="Sharpe / Max Drawdown"
          value={<><span style={{ color: 'var(--blue)' }}>{(m.sharpe_ratio || 0).toFixed(2)}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span style={{ color: 'var(--red)' }}>{p.max_drawdown_pct || p.drawdown_pct || 0}%</span></>}
          sub={`annualised · peak ${formatLakh(p.peak_value || 0)}`}
          color="var(--blue)" glowColor="#60a5fa"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 20, marginTop: 20 }} className="fade-up fade-up-4 mobile-full">
        {/* Left column */}
        <div>
          <SectionHeader title="Equity curve" action="vs Nifty 50 (dashed)" />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            {curve.length > 0 ? <EquityChart data={curve} markers={markers} height={220} /> : <EmptyState text="No backtest data" />}
          </div>

          <SectionHeader title="Monthly returns" />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 16px 12px' }}>
            <MonthlyHeatmap data={monthly} />
          </div>

          <SectionHeader title="Performance by sector" />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 12px' }}>
            {sectors.length > 0 ? <SectorChart data={sectors} /> : <EmptyState text="No trade data" />}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Regime verdict — placed first so it's visible */}
          <RegimeVerdict regime="BEAR" confidence={80} />

          <SectionHeader title="Market regime" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <RegimeCard label="India VIX" value={15.0} max={40} />
            <RegimeCard label="Breadth" value={9.2} max={100} />
            <RegimeCard label="Nifty RSI" value={33.9} max={100} />
            <RegimeCard label="Nifty ADX" value={28} max={50} />
          </div>

          <SectionHeader title="Engine" />
          <EngineStatus />

          <SectionHeader title="Signals" action={<Link to="/signals" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 11 }}>View all &rarr;</Link>} />
          <EmptyState text="No signals today · BEAR regime blocks entries" />
        </div>
      </div>
    </div>
  )
}

function RegimeVerdict({ regime = 'BEAR', confidence = 80 }) {
  const colors = { BULL: 'var(--green)', BEAR: 'var(--red)', CHOPPY: 'var(--amber)' }
  const bgs = { BULL: 'var(--green-bg)', BEAR: 'var(--red-bg)', CHOPPY: 'var(--amber-bg)' }
  const borders = { BULL: 'var(--green-border)', BEAR: 'var(--red-border)', CHOPPY: 'var(--amber-border)' }
  const subs = { BULL: 'Signals active', BEAR: 'No new entries', CHOPPY: 'Cautious entries only' }
  const spaced = regime.split('').join(' ')

  return (
    <div style={{
      background: bgs[regime] || 'var(--bg-card)',
      border: `1px solid ${borders[regime] || 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', padding: 20, textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--text-display)', fontSize: 36, fontWeight: 800,
        letterSpacing: 8, color: colors[regime] || 'var(--text-primary)',
      }}>{spaced}</div>
      <div style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        {confidence}% confidence · {subs[regime] || ''}
      </div>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      margin: '20px 0 8px', fontFamily: 'var(--text-mono)', fontSize: 10,
      color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5,
    }}>
      <span>{title}</span>
      {typeof action === 'string' ? <span style={{ color: 'var(--purple)' }}>{action}</span> : action}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: 40, textAlign: 'center', fontFamily: 'var(--text-mono)', fontSize: 13, color: 'var(--text-dim)',
    }}>{text}</div>
  )
}
