import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import StockSearch from './StockSearch'
import Timestamp from './Timestamp'
import TickerTape from './TickerTape'
import { usePortfolioContext } from '../context/PortfolioContext'
import { getMarketStatus } from '../utils/nseApi'
import { formatINR } from '../utils/pnlCalculations'

const tabs = [
  { to: '/', label: 'Terminal', shortcut: 't' },
  { to: '/premove', label: 'Pre-Move', shortcut: 'p', accent: true },
  { to: '/portfolio', label: 'Portfolio', shortcut: 'f' },
  { to: '/pnl', label: 'P&L', shortcut: 'l' },
  { to: '/journal', label: 'Journal', shortcut: 'j' },
  { to: '/backtest', label: 'Backtest', shortcut: 'b' },
]

function MarketStatusDot() {
  const status = getMarketStatus()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: status.color }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: status.color,
        animation: status.status === 'open' ? 'pulse 2s infinite' : 'none',
      }} />
      {status.label}
    </div>
  )
}

function ModeBadge({ mode, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 4,
      background: mode === 'live' ? 'var(--green-d)' : 'var(--amber-d)',
      border: `1px solid ${mode === 'live' ? 'var(--green-b)' : 'var(--amber-b)'}`,
      color: mode === 'live' ? 'var(--green)' : 'var(--amber)',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      cursor: 'pointer', fontFamily: 'var(--mono)',
      transition: 'all 0.15s var(--ease-out)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: mode === 'live' ? 'var(--green)' : 'var(--amber)',
      }} />
      {mode === 'live' ? 'LIVE' : 'DEMO'}
    </button>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const { mode, toggleMode, todayPnl } = usePortfolioContext()
  const [scrolled, setScrolled] = useState(false)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const indicatorRef = useRef({ left: 0, width: 0 })

  const updateIndicator = useCallback((el) => {
    if (el) {
      const left = el.offsetLeft
      const width = el.offsetWidth
      if (left !== indicatorRef.current.left || width !== indicatorRef.current.width) {
        indicatorRef.current = { left, width }
        setIndicatorStyle({ left, width })
      }
    }
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-terminal)' }}>
      {/* ── Top Nav ── */}
      <nav style={{
        height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        borderBottom: '1px solid var(--border-widget)',
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
        transition: 'background 0.15s var(--ease-out)',
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 14, fontWeight: 700, letterSpacing: '0.05em',
          color: 'var(--green)', marginRight: 8,
          fontFamily: 'var(--mono)',
        }}>NQ</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 1, position: 'relative', marginRight: 'auto' }} className="desktop-tabs">
          {tabs.map(t => {
            const active = t.to === '/' ? location.pathname === '/' : location.pathname.startsWith(t.to)
            return (
              <span key={t.to} ref={el => { if (active && el) updateIndicator(el) }}>
                <NavLink to={t.to} style={{
                  padding: '6px 14px', borderRadius: 4, textDecoration: 'none',
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
                  fontFamily: 'var(--mono)',
                  color: active ? 'var(--text-primary)' : t.accent ? 'var(--green)' : 'var(--text-tertiary)',
                  background: active ? 'var(--bg-active)' : 'transparent',
                  transition: 'color 0.15s, background 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-glass)' }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = t.accent ? 'var(--green)' : 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}}
                >
                  {t.label}
                  {t.accent && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--green)',
                      animation: 'pulse 2s infinite',
                    }} />
                  )}
                </NavLink>
              </span>
            )
          })}
          {/* Active indicator */}
          <div style={{
            position: 'absolute', bottom: -1, height: 2,
            background: 'var(--green)', borderRadius: 1,
            transition: 'left 0.25s cubic-bezier(0.16,1,0.3,1), width 0.25s cubic-bezier(0.16,1,0.3,1)',
            left: indicatorStyle.left, width: indicatorStyle.width,
          }} />
        </div>

        {/* Right side */}
        <StockSearch />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="desktop-only">
          <MarketStatusDot />
          <ModeBadge mode={mode} onToggle={toggleMode} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <Timestamp value={new Date().toISOString()} prefix="" />
          </span>
        </div>
      </nav>

      {/* ── Ticker Tape ── */}
      <TickerTape />

      {/* ── Status Bar ── */}
      <div style={{
        height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-widget)',
        fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
      }} className="desktop-only">
        <span>NiftyQuant Terminal v4.0 + Pre-Move Engine</span>
        <span style={{ display: 'flex', gap: 16 }}>
          <span>P&L: <span style={{ color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{formatINR(todayPnl)}</span></span>
          <span>{mode === 'live' ? 'LIVE' : 'DEMO'}</span>
        </span>
      </div>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, padding: 16, maxWidth: 1600, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <div className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 52, background: 'rgba(10,10,10,0.95)',
        borderTop: '1px solid var(--border-widget)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.slice(0, 5).map(t => {
          const active = t.to === '/' ? location.pathname === '/' : location.pathname.startsWith(t.to)
          return (
            <NavLink key={t.to} to={t.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              textDecoration: 'none', padding: '4px 8px',
              fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
              color: active ? 'var(--green)' : 'var(--text-muted)',
              fontFamily: 'var(--mono)',
            }}>
              {t.label}
              {active && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--green)' }} />}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
