import React from 'react'

export default function StopBar({ currentPrice, stopPrice, entryPrice }) {
  const totalRange = entryPrice - stopPrice
  const currentBuffer = currentPrice - stopPrice
  const bufferPct = totalRange > 0 ? Math.max(0, Math.min(100, (currentBuffer / totalRange) * 100)) : 0
  const color = bufferPct > 60 ? '#34d399' : bufferPct > 30 ? '#fbbf24' : '#f87171'
  const isPulsing = bufferPct < 20

  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
        <div style={{
          width: `${bufferPct}%`, height: '100%', background: color, borderRadius: 2,
          transition: 'width 0.5s ease, background 0.3s',
          animation: isPulsing ? 'danger-pulse 1s infinite' : 'none',
        }} />
      </div>
      <div className="tabular" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, letterSpacing: 0.3 }}>
        {bufferPct.toFixed(0)}% above stop
      </div>
    </div>
  )
}
