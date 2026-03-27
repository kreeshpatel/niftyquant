import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreMoveDetection } from '../../hooks/usePreMoveDetection'

export default function PreMoveWidget() {
  const { detections, scanning, strongSignals } = usePreMoveDetection()
  const navigate = useNavigate()
  const top5 = detections.slice(0, 5)

  return (
    <div className="widget" style={{ borderColor: strongSignals.length > 0 ? 'rgba(16,185,129,0.3)' : undefined }}>
      <div className="widget-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)',
            animation: scanning ? 'pulse 0.8s infinite' : 'pulse 2s infinite',
          }} />
          Volatility Alerts
        </span>
        <button onClick={() => navigate('/premove')} style={{
          background: 'none', border: 'none', color: 'var(--green)',
          fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          fontFamily: 'var(--mono)',
        }}>VIEW ALL &rarr;</button>
      </div>
      <div className="widget-body" style={{ padding: 0 }}>
        {scanning && (
          <div style={{
            height: 2, background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
            backgroundSize: '200% 100%', animation: 'scan 1.5s linear infinite',
          }} />
        )}
        {top5.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            No volatility signals detected
          </div>
        ) : (
          top5.map((d, i) => (
            <div key={d.ticker} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              borderBottom: i < top5.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div style={{
                width: 4, height: 28, borderRadius: 2,
                background: d.strength === 'STRONG' ? 'var(--green)' : d.strength === 'MODERATE' ? 'var(--amber)' : 'var(--text-muted)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{d.ticker}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--amber)', letterSpacing: '0.04em' }}>
                    VOLATILITY
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    <span>{d.sector}</span>
                    {d.hint && d.hint !== 'direction unclear' && (
                      <span style={{
                        color: d.hint.includes('bullish') ? 'var(--green)' : 'var(--red)',
                        fontStyle: 'italic',
                      }}>{d.hint}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 1 }}>
                      {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, j) => (
                        <div key={j} style={{
                          width: 3, height: 8, borderRadius: 1,
                          background: d.composite >= threshold ? 'var(--green)' : 'var(--border-widget)',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {(d.composite * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
