import React from 'react'
import { T } from '../theme'

function Bar({ label, value, max }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: T.textDim, width: 28, letterSpacing: 1 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: T.bgLine }}>
        <div style={{ height: 4, width: `${pct}%`, background: T.amber, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: T.textMuted, width: 30, textAlign: 'right' }}>{value?.toFixed?.(1) ?? value}</span>
    </div>
  )
}

export default function SignalCard({ signal }) {
  const blocked = !signal.risk_allowed
  const mlBg = signal.ml_score > 0.56 ? T.dimGreen : signal.ml_score >= 0.52 ? T.dimAmber : T.bgSubtle
  const mlColor = signal.ml_score > 0.56 ? T.green : signal.ml_score >= 0.52 ? T.amber : T.textMuted

  return (
    <div style={{
      background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 14, position: 'relative',
      opacity: blocked ? 0.5 : 1,
    }}>
      {blocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: T.red,
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.amber }}>{signal.ticker}</span>
        <span style={{
          padding: '2px 8px', fontSize: 11, fontWeight: 700, background: mlBg, color: mlColor,
        }}>{signal.ml_score?.toFixed(3)}</span>
      </div>
      <Bar label="ADX" value={signal.adx_14 || 0} max={50} />
      <Bar label="RSI" value={signal.rsi_14 || 0} max={100} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 10, color: T.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
        <span style={{ padding: '1px 6px', background: T.bgSubtle }}>{signal.sector}</span>
        <span>Rs {signal.entry_price?.toFixed(2)}</span>
        <span>STOP {signal.atr_stop?.toFixed(2)}</span>
      </div>
      {blocked && <div style={{ fontSize: 10, color: T.red, marginTop: 6, letterSpacing: 1 }}>{signal.risk_reason}</div>}
      {!blocked && signal.position_size_suggested > 0 && (
        <div style={{ fontSize: 10, color: T.textDim, marginTop: 6 }}>
          SIZE: Rs {signal.position_size_suggested?.toLocaleString()}
        </div>
      )}
    </div>
  )
}
