import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import StockSearch from './StockSearch'

const tabs = [
  { to: '/', label: 'Overview' },
  { to: '/positions', label: 'Positions' },
  { to: '/signals', label: 'Signals' },
  { to: '/backtest', label: 'Backtest' },
  { to: '/trades', label: 'Trades' },
]

function RegimePill({ regime = 'BEAR' }) {
  const colors = { BULL: 'var(--green)', BEAR: 'var(--red)', CHOPPY: 'var(--amber)' }
  const bgs = { BULL: '#34d39915', BEAR: '#f8717115', CHOPPY: '#fbbf2415' }
  const borders = { BULL: '#34d39930', BEAR: '#f8717130', CHOPPY: '#fbbf2430' }
  const c = colors[regime] || 'var(--text-dim)'
  const shouldPulse = regime !== 'BULL'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      borderRadius: 20, background: bgs[regime] || 'transparent',
      border: `1px solid ${borders[regime] || 'var(--border)'}`,
      fontFamily: 'var(--text-mono)', fontSize: 10, fontWeight: 500, color: c, letterSpacing: 1,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: c,
        animation: shouldPulse ? 'pulse 2s infinite' : 'none',
      }} />
      {regime}
    </span>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-base)',
        position: 'sticky', top: 0, zIndex: 50,
      }} className="fade-up">
        <div style={{
          fontSize: 20, fontWeight: 800, letterSpacing: -1, marginRight: 40,
          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'var(--text-display)',
        }}>NiftyQuant</div>

        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {tabs.map(t => {
            const active = location.pathname === t.to
            return (
              <NavLink key={t.to} to={t.to} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                fontFamily: 'var(--text-display)', fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                color: active ? 'var(--text-primary)' : 'var(--text-dim)',
                background: active ? 'var(--bg-active)' : 'transparent',
                transition: 'color 0.15s, background 0.15s',
              }}>{t.label}</NavLink>
            )
          })}
        </div>

        <StockSearch />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RegimePill regime="BEAR" />
          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{now}</span>
        </div>
      </nav>

      <div style={{
        height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--text-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5,
      }}>
        <span>NiftyQuant · Engine v1 · model base_v2 · AUC 0.595</span>
        <span>0 positions · 100% cash · updated {now}</span>
      </div>

      <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
