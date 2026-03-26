import React from 'react'

export default function Positions() {
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--text-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>Open positions</h1>
        <p style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>0 positions · 100% cash</p>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 60, textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'var(--text-display)', fontSize: 18, color: 'var(--text-dim)', marginBottom: 8 }}>
          No open positions
        </div>
        <div style={{ fontFamily: 'var(--text-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
          Engine is in cash · waiting for signals
        </div>
      </div>
    </div>
  )
}
