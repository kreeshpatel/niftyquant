import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, formatLakh } from '../api'
import MetricHero from '../components/MetricHero'
import EquityChart from '../components/EquityChart'
import EngineStatus from '../components/EngineStatus'
import RegimeCard from '../components/RegimeCard'

export default function Overview() {
  const [data, setData] = useState(null)
  useEffect(() => { fetchOverview().then(setData) }, [])

  const p = data?.portfolio || {}
  const m = data?.metrics || {}
  const curve = data?.equity_curve || []
  const ret = p.total_return_pct || 0
  const wins = Math.round((m.win_rate || 0) / 100 * (m.total_trades || 0))
  const losses = (m.total_trades || 0) - wins

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', overflow: 'hidden' }} className="fade-up fade-up-1 mobile-stack">
        <MetricHero
          label="Portfolio Value"
          value={`${formatLakh(p.total_value || 1000000)}`}
          sub={<span style={{ color: ret >= 0 ? 'var(--green)' : 'var(--red)' }}>{ret >= 0 ? '+' : ''}{ret.toFixed(1)}% since inception</span>}
          color="var(--purple)" glowColor="#a78bfa"
        />
        <MetricHero
          label="Profit Factor / Win Rate"
          value={<><span style={{ color: 'var(--green)' }}>{m.profit_factor || 0}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span>{m.win_rate || 0}%</span></>}
          sub={`${wins}W · ${losses}L · ${m.total_trades || 0} trades`}
          color="var(--text-primary)" glowColor="#34d399"
        />
        <MetricHero
          label="Sharpe / Max Drawdown"
          value={<><span style={{ color: 'var(--blue)' }}>{m.sharpe_ratio || 0}</span><span style={{ color: 'var(--text-dim)', fontSize: 24 }}> | </span><span style={{ color: 'var(--red)' }}>{p.drawdown_pct || 0}%</span></>}
          sub={`annualised · peak ${formatLakh(p.peak_value || 0)}`}
          color="var(--blue)" glowColor="#60a5fa"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 20, marginTop: 20 }} className="fade-up fade-up-4 mobile-full">
        <div>
          <SectionHeader title="Equity curve" action="vs Nifty 50" />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            {curve.length > 0 ? <EquityChart data={curve} /> : <EmptyState text="No backtest data — add CSV files to results/" />}
          </div>

          <SectionHeader title="Today's signals" action={<Link to="/signals" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 11 }}>View all &rarr;</Link>} />
          <EmptyState text="No signals today · Market regime blocks entries" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader title="Engine" />
          <EngineStatus />

          <SectionHeader title="Market regime" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <RegimeCard label="India VIX" value={15.0} max={40} color="var(--red)" />
            <RegimeCard label="Breadth" value={9.2} max={100} color="var(--amber)" />
            <RegimeCard label="Nifty RSI" value={33.9} max={100} color="var(--purple)" />
            <RegimeCard label="Nifty ADX" value={28} max={50} color="var(--blue)" />
          </div>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '24px 20px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--text-display)', fontSize: 28, fontWeight: 800, color: 'var(--red)',
              textShadow: '0 0 40px #f8717120',
            }}>BEAR</div>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>80% confidence</div>
          </div>
        </div>
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
