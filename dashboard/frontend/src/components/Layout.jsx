import React from 'react'
import { NavLink } from 'react-router-dom'
import { T } from '../theme'

const tabs = [
  ['/', 'OVERVIEW'], ['/features', 'FEATURES'], ['/walk-forward', 'WALK-FORWARD'],
  ['/trades', 'TRADE LOG'],
]

export default function Layout({ children }) {
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
        minHeight: 38, background: T.bgElevated, borderBottom: `1px solid ${T.bgLine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ marginRight: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.amber, letterSpacing: 3 }}>
              NIFTYQUANT
            </span>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, marginTop: 1 }}>
              NSE Algorithmic Trading &middot; 359 Stocks &middot; ML-Enhanced Signals
            </div>
          </div>
          {tabs.map(([path, label]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: T.textMuted }}>
          <span style={{
            padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            background: T.amber + '18', color: T.amber, border: `1px solid ${T.amber}30`,
          }}>BACKTEST</span>
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
          'MODE: BACKTEST RESULTS',
          'INITIAL CAPITAL: \u20B910,00,000',
          'PLATFORM: VERCEL',
        ].map((s, i) => (
          <span key={i} style={{ padding: '0 12px', borderRight: `1px solid ${T.bgLine}` }}>{s}</span>
        ))}
      </div>
    </div>
  )
}
