import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useWebSocket } from '../api'
import { T, regimeColor } from '../theme'

const tabs = [
  ['/', 'OVERVIEW'], ['/positions', 'POSITIONS'], ['/signals', 'SIGNALS'],
  ['/backtest', 'BACKTEST'], ['/trades', 'TRADE LOG'],
]

export default function Layout({ children }) {
  const { data, connected } = useWebSocket()
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  const regime = data?.regime?.regime || '—'
  const p = data?.portfolio || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <style>{`
        .nav-tab { padding: 0 14px; height: 38px; display: flex; align-items: center;
          font-size: 11px; letter-spacing: 1.5px; color: ${T.textMuted}; border-bottom: 2px solid transparent;
          text-transform: uppercase; transition: all 0.15s; }
        .nav-tab:hover { color: ${T.textPrimary}; background: ${T.bgSubtle}; }
        .nav-tab.active { color: ${T.amber}; border-bottom-color: ${T.amber}; }
      `}</style>

      {/* Top nav */}
      <nav style={{
        height: 38, background: T.bgElevated, borderBottom: `1px solid ${T.bgLine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.amber, letterSpacing: 3, marginRight: 24 }}>
            NIFTYQUANT
          </span>
          {tabs.map(([path, label]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: T.textMuted }}>
          <span style={{
            padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            background: regimeColor(regime) + '18', color: regimeColor(regime), border: `1px solid ${regimeColor(regime)}30`,
          }}>{regime}</span>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: connected ? T.green : T.red,
            animation: connected ? 'pulse 2s ease infinite' : 'none',
          }} />
          <span style={{ color: T.textDim }}>{time} IST</span>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 16 }}>{children}</main>

      {/* Bottom status bar */}
      <div style={{
        height: 28, background: T.bgBase, borderTop: `1px solid ${T.bgLine}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0,
        fontSize: 10, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase',
      }}>
        {[
          `POSITIONS: ${p.n_positions || 0}/20`,
          `CASH: Rs ${(p.cash || 0).toLocaleString()}`,
          `INVESTED: Rs ${(p.invested || 0).toLocaleString()}`,
          `CIRCUIT BREAKER: OFF`,
          `WS: ${connected ? 'LIVE' : 'DOWN'}`,
        ].map((s, i) => (
          <span key={i} style={{ padding: '0 12px', borderRight: `1px solid ${T.bgLine}` }}>{s}</span>
        ))}
      </div>
    </div>
  )
}
