import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, formatLakh } from '../api'
import MetricHero from '../components/MetricHero'
import EquityChart from '../components/EquityChart'
import EngineStatus from '../components/EngineStatus'
import RegimeCard from '../components/RegimeCard'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import SectorChart from '../components/SectorChart'
import TopLoader from '../components/TopLoader'
import AICommentary from '../components/AICommentary'
import EconomicCalendar from '../components/EconomicCalendar'
import ClaudeInsights from '../components/ClaudeInsights'

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (target == null || target === 0) { setValue(target || 0); return }
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])
  return value
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
  const ret = p.backtest_return_pct ?? p.total_return_pct ?? 0
  const lastEquity = curve.length > 0 ? curve[curve.length - 1].value : (p.total_value || 1000000)

  // Animated hero numbers
  const animVal = useCountUp(lastEquity, 1200)
  const animPF = useCountUp(m.profit_factor || 0, 1000)
  const animWR = useCountUp(m.win_rate || 0, 1000)
  const animSharpe = useCountUp(m.sharpe_ratio || 0, 900)
  const animDD = useCountUp(Math.abs(p.max_drawdown_pct || p.drawdown_pct || 0), 900)
  const animRet = useCountUp(Math.abs(ret), 1000)

  const wins = Math.round((m.win_rate || 0) / 100 * (m.total_trades || 0))
  const losses = (m.total_trades || 0) - wins

  return (
    <div>
      <TopLoader loading={!data} />
      {/* Hero metrics */}
      <div style={{
        display: 'flex', border: '1px solid var(--border)', background: 'var(--bg-card)',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }} className="anim-fade-up stagger-1 mobile-stack">
        <MetricHero
          label="Portfolio Value"
          value={formatLakh(Math.round(animVal) || 1000000)}
          sub={<span style={{ color: ret >= 0 ? 'var(--green)' : 'var(--red)' }}>{ret >= 0 ? '+' : ''}{animRet.toFixed(1)}% backtest return</span>}
          color="var(--purple)" glowColor="#818cf8"
        />
        <MetricHero
          label="Profit Factor / Win Rate"
          value={<><span style={{ color: 'var(--green)' }}>{animPF.toFixed(2)}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span>{animWR.toFixed(1)}%</span></>}
          sub={`${wins}W · ${losses}L · ${m.total_trades || 0} trades · with Claude AI`}
          color="var(--text)" glowColor="#34d399"
        />
        <MetricHero
          label="Sharpe / Max Drawdown"
          value={<><span style={{ color: 'var(--blue)' }}>{animSharpe.toFixed(2)}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span style={{ color: 'var(--red)' }}>-{animDD.toFixed(1)}%</span></>}
          sub={`annualised · peak ${formatLakh(p.peak_value || 0)}`}
          color="var(--blue)" glowColor="#60a5fa"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 20, marginTop: 20 }} className="anim-fade-up stagger-4 mobile-full">
        {/* Left column */}
        <div>
          <SectionHeader title="Equity curve" action="vs Nifty 50 (dashed)" />
          <div className="glass lift" style={{ padding: 20 }}>
            {curve.length > 0 ? <EquityChart data={curve} markers={markers} height={220} /> : <EmptyState text="No backtest data" />}
          </div>

          <SectionHeader title="Monthly returns" />
          <div className="glass lift" style={{ padding: '16px 16px 12px' }}>
            <MonthlyHeatmap data={monthly} />
          </div>

          <SectionHeader title="Performance by sector" />
          <div className="glass lift" style={{ padding: '16px 12px' }}>
            {sectors.length > 0 ? <SectorChart data={sectors} /> : <EmptyState text="No trade data" />}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RegimeVerdict regime="BEAR" confidence={80} />

          <AICommentary regime="BEAR" breadth="9.2" vix="15.0" rsi="33.9" adx="28" />

          <SectionHeader title="Market regime" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <RegimeCard label="India VIX" value={15.0} max={40} />
            <RegimeCard label="Breadth" value={9.2} max={100} />
            <RegimeCard label="Nifty RSI" value={33.9} max={100} />
            <RegimeCard label="Nifty ADX" value={28} max={50} />
          </div>

          <SectionHeader title="Engine" />
          <EngineStatus />

          <EconomicCalendar />

          <ClaudeInsights />

          <SectionHeader title="Signals" action={<Link to="/signals" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 11 }}>View all &rarr;</Link>} />
          <EmptyState text="No signals today · BEAR regime blocks entries" />
        </div>
      </div>
    </div>
  )
}

function RegimeVerdict({ regime = 'BEAR', confidence = 80 }) {
  const isBear = regime === 'BEAR' || regime === 'BEAR_STRONG' || regime === 'BEAR_MILD'
  const isBull = regime === 'BULL'
  const color = isBear ? '#f87171' : isBull ? '#34d399' : '#fbbf24'
  const bgColor = isBear ? 'rgba(248,113,113,0.06)' : isBull ? 'rgba(52,211,153,0.06)' : 'rgba(251,191,36,0.06)'
  const glowAnim = isBear ? 'bearGlow 3s infinite' : isBull ? 'bullGlow 3s infinite' : 'none'

  return (
    <div style={{
      position: 'relative', borderRadius: 16, padding: 24,
      background: bgColor, border: `1px solid ${color}25`,
      overflow: 'hidden', textAlign: 'center', animation: glowAnim,
    }}>
      {/* Animated background rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute', width: i * 80, height: i * 80, borderRadius: '50%',
            border: `1px solid ${color}`, opacity: 0.06 / i,
            animation: `regimePulse ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800,
        letterSpacing: 6, color, lineHeight: 1, marginBottom: 8,
        position: 'relative', zIndex: 1, textShadow: `0 0 40px ${color}50`,
      }}>{regime?.replace('_', ' ')}</div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, color: `${color}80`,
        letterSpacing: 1, marginBottom: 12, position: 'relative', zIndex: 1,
      }}>{confidence}% confidence</div>

      <div style={{
        height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2,
        overflow: 'hidden', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          height: '100%', width: `${confidence}%`,
          background: `linear-gradient(90deg, ${color}60, ${color})`,
          borderRadius: 2, transition: 'width 1s ease',
        }} />
      </div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.25)',
        marginTop: 10, letterSpacing: 0.5, position: 'relative', zIndex: 1,
      }}>
        {isBear && 'No new entries \u00B7 capital preserved'}
        {isBull && 'Signals active \u00B7 full position size'}
        {!isBear && !isBull && 'Selective entries \u00B7 reduced size'}
      </div>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      margin: '20px 0 8px', fontFamily: 'var(--mono)', fontSize: 10,
      color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5,
    }}>
      <span>{title}</span>
      {typeof action === 'string' ? <span style={{ color: 'var(--purple)' }}>{action}</span> : action}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="glass" style={{
      padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)',
    }}>{text}</div>
  )
}
