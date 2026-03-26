import React, { useState } from 'react'
import MetricHero from '../components/MetricHero'
import EquityChart from '../components/EquityChart'

const inputStyle = {
  width: '100%', padding: '7px 10px', background: '#ffffff08',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)', fontFamily: 'var(--text-mono)', fontSize: 12, outline: 'none',
}

export default function Backtest() {
  const [params, setParams] = useState({
    start_date: '2022-01-01', end_date: '2026-03-24', use_ml: true,
    buy_threshold: 0.52, initial_capital: 1000000, max_positions: 20,
  })

  return (
    <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 20,
      }}>
        <div style={{
          fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20,
        }}>Backtest parameters</div>

        {[['Start Date', 'start_date', 'date'], ['End Date', 'end_date', 'date'], ['Capital', 'initial_capital', 'number']].map(([l, k, t]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{l}</div>
            <input type={t} value={params[k]} onChange={e => setParams({ ...params, [k]: t === 'number' ? +e.target.value : e.target.value })} style={inputStyle} />
          </div>
        ))}

        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div onClick={() => setParams({ ...params, use_ml: !params.use_ml })} style={{
            width: 40, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s',
            background: params.use_ml ? 'var(--purple)' : 'var(--border)',
            display: 'flex', alignItems: 'center', padding: 2,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              transform: params.use_ml ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-primary)' }}>ML FILTER</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
            THRESHOLD: {params.buy_threshold}
          </div>
          <input type="range" min="0.50" max="0.70" step="0.01" value={params.buy_threshold}
            onChange={e => setParams({ ...params, buy_threshold: +e.target.value })}
            style={{ width: '100%', accentColor: '#a78bfa' }} />
        </div>

        <button style={{
          width: '100%', height: 44,
          background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
          border: 'none', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--text-display)', fontSize: 13, fontWeight: 700,
          color: 'white', letterSpacing: 1, cursor: 'pointer',
        }}>RUN BACKTEST</button>
      </div>

      <div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 60, textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--text-display)', fontSize: 16, color: 'var(--text-dim)', marginBottom: 8 }}>
            Configure parameters and run backtest
          </div>
          <div style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            Backtesting requires a running backend server
          </div>
        </div>
      </div>
    </div>
  )
}
