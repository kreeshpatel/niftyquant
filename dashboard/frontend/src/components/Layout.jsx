import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import StockSearch from './StockSearch'
import Timestamp from './Timestamp'
import TickerTape from './TickerTape'

const tabs = [
  { to: '/', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { to: '/screener', label: 'Screener', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to: '/signals', label: 'Signals', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0' },
  { to: '/heatmap', label: 'Heatmap', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
  { to: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m0 0v-9a2 2 0 012-2h2a2 2 0 012 2v9m-6 0h6' },
  { to: '/backtest', label: 'Backtest', icon: 'M13 10V3L4 14h7v7l9-11h-7' },
  { to: '/trades', label: 'Trades', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/3d', label: '3D', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', badge: 'NEW' },
]

function NavIcon({ d, size = 18, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

function RegimePill({ regime = 'BEAR' }) {
  const colors = { BULL: 'var(--green)', BEAR: 'var(--red)', CHOPPY: 'var(--amber)' }
  const bgs = { BULL: 'var(--green-d)', BEAR: 'var(--red-d)', CHOPPY: 'var(--amber-d)' }
  const borders = { BULL: 'var(--green-b)', BEAR: 'var(--red-b)', CHOPPY: 'var(--amber-b)' }
  const c = colors[regime] || 'var(--text-dim)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      borderRadius: 20, background: bgs[regime] || 'transparent',
      border: `1px solid ${borders[regime] || 'var(--border)'}`,
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: c, letterSpacing: 1,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, animation: regime !== 'BULL' ? 'pulse 2s infinite' : 'none' }} />
      {regime}
    </span>
  )
}

function DataFreshness() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hr = ist.getHours(), min = ist.getMinutes(), day = ist.getDay()
  const t = hr * 60 + min
  const isWeekday = day >= 1 && day <= 5
  let color, label
  if (!isWeekday) { color = 'var(--text-dim)'; label = 'Weekend' }
  else if (t >= 555 && t <= 930) { color = 'var(--green)'; label = 'Market open' }
  else if (t >= 540 && t < 555) { color = 'var(--amber)'; label = 'Pre-market' }
  else { color = 'var(--text-dim)'; label = 'After hours' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 10, color }} className="desktop-only">
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </div>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{
        height: 54, display: 'flex', alignItems: 'center', padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: scrolled ? 'rgba(8,8,16,0.95)' : 'rgba(8,8,16,0.7)',
        boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.06)' : 'none',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
        transition: 'background 0.3s, box-shadow 0.3s',
      }} className="anim-fade-in">
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: -1, marginRight: 32,
          background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'var(--sans)',
          animation: 'float 3s ease-in-out infinite',
        }}>NiftyQuant</div>

        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', maxWidth: '50vw' }} className="desktop-tabs">
          {tabs.map(t => {
            const active = location.pathname === t.to
            return (
              <NavLink key={t.to} to={t.to} style={{
                padding: '6px 14px', borderRadius: 'var(--r-sm)', textDecoration: 'none',
                fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                color: active ? 'var(--text)' : 'var(--text-dim)',
                background: active ? 'var(--bg-active)' : 'transparent',
                borderBottom: active ? '2px solid var(--purple)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { if (!active) { e.target.style.color = 'var(--text-sub)'; e.target.style.background = 'var(--bg-hover)' }}}
                onMouseLeave={e => { if (!active) { e.target.style.color = 'var(--text-dim)'; e.target.style.background = 'transparent' }}}
              >
                {t.label}
                {t.badge && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 4px',
                    borderRadius: 4, background: 'var(--purple-d)',
                    color: 'var(--purple)', marginLeft: 4, letterSpacing: 0.5,
                  }}>{t.badge}</span>
                )}
              </NavLink>
            )
          })}
        </div>

        <StockSearch />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DataFreshness />
          <RegimePill regime="BEAR" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }} className="desktop-only">
            <Timestamp value={new Date().toISOString()} prefix="Updated " />
          </span>
        </div>
      </nav>

      {/* Ticker tape */}
      <TickerTape />

      {/* Status bar */}
      <div style={{
        height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,16,0.9)',
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-ghost)', letterSpacing: 0.5,
      }} className="desktop-only">
        <span>NiftyQuant · v3.0 + Claude AI · WR 42.9% · PF 1.49 · Sharpe 0.67 · -24.1% DD</span>
        <span>0 positions · 100% cash · updated {now}</span>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 56, background: 'rgba(8,8,16,0.9)', borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.slice(0, 5).map(t => {
          const active = location.pathname === t.to
          return (
            <NavLink key={t.to} to={t.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              textDecoration: 'none', padding: '4px 8px',
            }}>
              <NavIcon d={t.icon} size={20} color={active ? 'var(--purple)' : 'var(--text-dim)'} />
              {active && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--purple)', letterSpacing: 0.5 }}>{t.label}</span>}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
