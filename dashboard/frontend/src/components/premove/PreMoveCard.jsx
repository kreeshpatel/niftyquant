import React, { useState } from 'react'
import SignalBreakdown from './SignalBreakdown'
import { usePortfolioContext } from '../../context/PortfolioContext'

export default function PreMoveCard({ detection, regime }) {
  const [expanded, setExpanded] = useState(false)
  const [bought, setBought] = useState(false)
  const { addPreMoveTrade, trades } = usePortfolioContext()
  const d = detection
  const strengthColor = d.strength === 'STRONG' ? 'var(--green)' : d.strength === 'MODERATE' ? 'var(--amber)' : 'var(--text-tertiary)'
  const hintColor = d.hint?.includes('bullish') ? 'var(--green)' : d.hint?.includes('bearish') ? 'var(--red)' : 'var(--text-muted)'

  const alreadyTracked = trades.some(t => t.ticker === d.ticker && t.source === 'premove' && !t.exit_price)
  const isBullish = regime?.regime === 'BULLISH'
  const isStrong = d.strength === 'STRONG'
  const canTrade = isBullish && isStrong && !alreadyTracked && !bought

  const handleBuy = (e) => {
    e.stopPropagation()
    if (!canTrade) return
    addPreMoveTrade(d)
    setBought(true)
  }

  let btnLabel = 'PAPER BUY'
  let btnDisabled = !canTrade
  if (alreadyTracked) btnLabel = 'TRACKING'
  else if (bought) btnLabel = 'ADDED'
  else if (!isBullish) btnLabel = 'REGIME WAIT'
  else if (!isStrong) btnLabel = 'STRONG ONLY'

  return (
    <div className="widget" style={{
      borderLeft: `3px solid ${strengthColor}`,
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    }} onClick={() => setExpanded(e => !e)}>
      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{d.ticker}</span>
            <span className={`badge ${d.strength === 'STRONG' ? 'badge-green' : d.strength === 'MODERATE' ? 'badge-amber' : 'badge-purple'}`}>
              {d.strength}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.05em',
              padding: '2px 8px', borderRadius: 4,
              background: 'var(--amber-d)', border: '1px solid var(--amber-b)',
            }}>
              VOLATILITY
            </span>
            {d.hint && d.hint !== 'direction unclear' && (
              <span style={{ fontSize: 10, color: hintColor, fontStyle: 'italic' }}>
                ({d.hint})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: strengthColor, fontVariantNumeric: 'tabular-nums' }}>
              {(d.composite * 100).toFixed(0)}%
            </div>
            <button onClick={handleBuy} disabled={btnDisabled} title={
              !isBullish ? 'Regime not bullish \u2014 wait for better conditions'
              : !isStrong ? 'Only STRONG signals are tradeable'
              : ''
            } style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              fontFamily: 'var(--mono)', cursor: btnDisabled ? 'default' : 'pointer',
              border: '1px solid',
              background: canTrade ? 'var(--green-d)' : 'var(--bg-elevated)',
              borderColor: canTrade ? 'var(--green-b)' : 'var(--border-widget)',
              color: canTrade ? 'var(--green)' : 'var(--text-muted)',
              transition: 'all 0.15s', letterSpacing: '0.05em',
            }}>
              {btnLabel}
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, flexWrap: 'wrap' }}>
          <span>{d.sector}</span>
          <span>{'\u20B9'}{d.price?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
          <span style={{ color: (d.dayChange || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {(d.dayChange || 0) >= 0 ? '+' : ''}{(d.dayChange || 0).toFixed(2)}%
          </span>
          <span>RSI {d.rsi?.toFixed(0)}</span>
          <span>ADX {d.adx?.toFixed(0)}</span>
          <span>Vol {d.volumeRatio?.toFixed(1)}x</span>
        </div>

        {/* Signal strength bars */}
        <div style={{ display: 'flex', gap: 4, marginBottom: expanded ? 12 : 0 }}>
          {Object.entries(d.signals).map(([key, value]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, width: `${value * 100}%`,
                  background: value > 0.6 ? 'var(--green)' : value > 0.3 ? 'var(--amber)' : 'var(--text-muted)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {expanded && <SignalBreakdown signals={d.signals} />}
      </div>
    </div>
  )
}
