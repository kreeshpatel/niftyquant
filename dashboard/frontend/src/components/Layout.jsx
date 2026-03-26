import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import StockSearch from './StockSearch'

const tabs = [
  { to: '/', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { to: '/screener', label: 'Screener', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to: '/signals', label: 'Signals', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0' },
  { to: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m0 0v-9a2 2 0 012-2h2a2 2 0 012 2v9m-6 0h6' },
  { to: '/backtest', label: 'Backtest', icon: 'M13 10V3L4 14h7v7l9-11h-7' },
  { to: '/trades', label: 'Trades', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]

function NavIcon({ d, size = 18, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

function RegimePill({ regime = 'BEAR' }) {
  const colors = { BULL: 'var(--green)', BEAR: 'var(--red)', CHOPPY: 'var(--amber)' }
  const bgs = { BULL: '#34d39915', BEAR: '#f8717115', CHOPPY: '#fbbf2415' }
  const borders = { BULL: '#34d39930', BEAR: '#f8717130', CHOPPY: '#fbbf2430' }
  const c = colors[regime] || 'var(--text-dim)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      borderRadius: 20, background: bgs[regime] || 'transparent',
      border: `1px solid ${borders[regime] || 'var(--border)'}`,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, color: c, letterSpacing: 1,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, animation: regime !== 'BULL' ? 'pulse 2s infinite' : 'none' }} />
      {regime}
    </span>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-base)',
        position: 'sticky', top: 0, zIndex: 50,
      }} className="fade-up">
        <div style={{
          fontSize: 20, fontWeight: 800, letterSpacing: -1, marginRight: 32,
          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'var(--font-display)',
        }}>NiftyQuant</div>

        <div style={{ display: 'flex', gap: 2 }} className="desktop-tabs">
          {tabs.map(t => {
            const active = location.pathname === t.to
            return (
              <NavLink key={t.to} to={t.to} style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }} className="desktop-only">{now}</span>
        </div>
      </nav>

      {/* Status bar */}
      <div style={{
        height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5,
      }} className="desktop-only">
        <span>NiftyQuant · Engine v1 · model base_v2 · AUC 0.595</span>
        <span>0 positions · 100% cash · updated {now}</span>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 56, background: '#111114', borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.slice(0, 5).map(t => {
          const active = location.pathname === t.to
          return (
            <NavLink key={t.to} to={t.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              textDecoration: 'none', padding: '4px 8px',
            }}>
              <NavIcon d={t.icon} size={20} color={active ? 'var(--purple)' : 'var(--text-dim)'} />
              {active && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--purple)', letterSpacing: 0.5 }}>{t.label}</span>}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
