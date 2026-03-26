import React, { useEffect, useState } from 'react'
import { fetchStockDetail } from '../api'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

const mono = { fontFamily: 'var(--mono)' }
const sans = { fontFamily: 'var(--sans)' }

function rsiInfo(v) {
  if (v > 70) return { color: '#f87171', status: 'Overbought' }
  if (v > 50) return { color: '#34d399', status: 'Bullish' }
  if (v > 30) return { color: '#fbbf24', status: 'Neutral' }
  return { color: '#60a5fa', status: 'Oversold' }
}
function adxInfo(v) {
  if (v > 30) return { color: '#34d399', status: 'Strong trend' }
  if (v > 20) return { color: '#fbbf24', status: 'Moderate' }
  return { color: '#f87171', status: 'Weak/choppy' }
}
function bbInfo(v) {
  if (v > 0.8) return { color: '#f87171', status: 'Upper band' }
  if (v > 0.2) return { color: '#fbbf24', status: 'Mid range' }
  return { color: '#34d399', status: 'Lower band' }
}
function volInfo(v) {
  if (v > 2) return { color: '#34d399', status: 'High volume' }
  if (v > 1) return { color: '#fbbf24', status: 'Normal' }
  return { color: '#f87171', status: 'Low volume' }
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  const fmtDate = pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
  return (
    <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
      {'\u20B9'}{pt?.close?.toLocaleString('en-IN')} · {fmtDate}
    </div>
  )
}

export default function StockPanel({ ticker, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchStockDetail(ticker).then(d => { setData(d); setLoading(false) })
    requestAnimationFrame(() => setMounted(true))
    return () => setMounted(false)
  }, [ticker])

  if (!ticker) return null

  const d = data || {}
  const rsi = rsiInfo(d.rsi || 0)
  const adx = adxInfo(d.adx || 0)
  const bb = bbInfo(d.bbPct || 0)
  const vol = volInfo(d.volumeRatio || 0)
  const pos52 = d.posIn52w || 0
  const sparkData = d.sparkline || []
  const ret30 = sparkData.length >= 2 ? ((sparkData[sparkData.length - 1].close / sparkData[0].close - 1) * 100) : 0
  const chartColor = ret30 >= 0 ? '#818cf8' : '#f87171'

  // Range bar gradient
  const rangeGrad = pos52 > 0.6
    ? 'linear-gradient(90deg, #818cf8, #34d399)'
    : pos52 < 0.4
    ? 'linear-gradient(90deg, #f87171, #fbbf24)'
    : '#818cf8'
  const rangeAccent = pos52 > 0.6 ? '#34d399' : pos52 < 0.4 ? '#fbbf24' : '#818cf8'

  // Signal status
  let signalColor, signalTitle, signalSub
  if (d.hybridSignal === 1) {
    signalColor = '#34d399'
    signalTitle = 'Buy opportunity'
    signalSub = `Dip conviction: ${d.dipConviction || 'high'} · Momentum regime active`
  } else if (d.inMomentum === 1) {
    signalColor = '#fbbf24'
    signalTitle = 'On watchlist'
    signalSub = 'Stock in uptrend · waiting for dip'
  } else {
    signalColor = 'rgba(255,255,255,0.1)'
    signalTitle = 'Not in watchlist'
    const reasons = []
    if ((d.adx || 0) <= 25) reasons.push(`ADX too low (${(d.adx || 0).toFixed(0)} < 25)`)
    if (pos52 <= 0.5) reasons.push(`Not in upper 52w range (${(pos52 * 100).toFixed(0)}%)`)
    signalSub = reasons.join(' · ') || 'Momentum conditions not met'
  }

  const stagger = (i) => ({ animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 40}ms` })

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9998, animation: 'fadeIn 0.2s ease both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '8%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(680px, 92vw)', maxHeight: '84vh', overflowY: 'auto',
        background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        zIndex: 9999,
        animation: mounted ? 'panelSlideUp 280ms cubic-bezier(0.16,1,0.3,1) both' : 'none',
      }}>
        <style>{`
          @keyframes panelSlideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          }
        `}</style>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', ...mono, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Loading...</div>
        ) : !data ? (
          <div style={{ padding: 80, textAlign: 'center', ...mono, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Stock data not found</div>
        ) : (
          <>
            {/* Close button */}
            <div onClick={onClose} style={{
              position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s', zIndex: 1,
              color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >&times;</div>

            {/* ── HEADER ── */}
            <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', ...stagger(0) }}>
              <div>
                <div style={{
                  ...mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                  padding: '4px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 12,
                }}>{d.sector}</div>
                <div style={{ ...sans, fontSize: 38, fontWeight: 800, letterSpacing: -1.5, color: '#f0f0f8' }}>{d.ticker}</div>
                <div style={{ ...sans, fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{d.name}</div>
              </div>
              <div style={{ textAlign: 'right', paddingTop: 28 }}>
                <div className="tabular" style={{ ...mono, fontSize: 38, fontWeight: 500, color: '#f0f0f8', letterSpacing: -1 }}>
                  {'\u20B9'}{d.close?.toLocaleString('en-IN')}
                </div>
                <div style={{ ...mono, fontSize: 14, color: d.dayChange >= 0 ? '#34d399' : '#f87171', marginTop: 2 }}>
                  {d.dayChange >= 0 ? '\u2191' : '\u2193'} {d.dayChange >= 0 ? '+' : ''}{d.dayChange}% today
                </div>
              </div>
            </div>

            {/* ── PRICE CHART ── */}
            {sparkData.length > 5 && (
              <div style={{ padding: '20px 0 8px', ...stagger(1) }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`sparkFill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.20} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<ChartTooltip />} cursor={false} />
                    <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2} fill={`url(#sparkFill-${ticker})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 28px', ...mono, fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>30-day return</span>
                  <span style={{ color: ret30 >= 0 ? '#34d399' : '#f87171', fontWeight: 500 }}>
                    {ret30 >= 0 ? '+' : ''}{ret30.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* ── 52-WEEK RANGE ── */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stagger(2) }}>
              <div style={{ ...mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>52-week range</div>
              <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                {/* Progress fill */}
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pos52 * 100}%`, background: rangeGrad, borderRadius: 2 }} />
                {/* Price dot */}
                <div style={{
                  position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                  background: 'white', border: '3px solid #0d0d14',
                  boxShadow: `0 0 0 2px ${rangeAccent}`,
                  top: -6, left: `${pos52 * 100}%`, transform: 'translateX(-50%)',
                  transition: 'left 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, ...mono, fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'\u20B9'}{d.low52w?.toLocaleString('en-IN')}</span>
                <span style={{ color: '#f0f0f8', fontWeight: 500 }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'\u20B9'}{d.high52w?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* ── SIGNAL STATUS ── */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stagger(3) }}>
              <div style={{ borderLeft: `3px solid ${signalColor}`, paddingLeft: 16 }}>
                <div style={{ ...sans, fontSize: 16, fontWeight: 700, color: signalColor === 'rgba(255,255,255,0.1)' ? 'rgba(255,255,255,0.3)' : signalColor }}>
                  {signalTitle}
                </div>
                <div style={{ ...mono, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{signalSub}</div>
              </div>
            </div>

            {/* ── TRADE PLAN (if BUY signal) ── */}
            {d.hybridSignal === 1 && d.atr14 > 0 && (() => {
              const entry = Math.round(d.close * 1.002 * 100) / 100
              const stop = Math.round((entry - 1.5 * d.atr14) * 100) / 100
              const target = Math.round((entry + 3.0 * d.atr14) * 100) / 100
              const risk = Math.round((entry - stop) * (150000 / entry))
              const rr = ((target - entry) / (entry - stop)).toFixed(1)
              return (
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stagger(4) }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 12 }}>
                    {[['ENTRY', entry, '#fbbf24'], ['STOP', stop, '#f87171'], ['TARGET', target, '#34d399']].map(([label, val, color]) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ ...mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>{label}</div>
                        <div className="tabular" style={{ ...mono, fontSize: 24, fontWeight: 500, color }}>{'\u20B9'}{val.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                    ~8 day hold · {'\u20B9'}{risk.toLocaleString('en-IN')} at risk · {rr} R:R
                  </div>
                </div>
              )
            })()}

            {/* ── METRICS GRID ── */}
            <div style={{ padding: '24px 28px 28px', ...stagger(5) }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 16px' }}>
                <Metric label="RSI (14)" value={(d.rsi || 0).toFixed(1)} {...rsi} />
                <Metric label="MACD" value={(d.macdHist || 0).toFixed(2)} color={(d.macdHist || 0) >= 0 ? '#34d399' : '#f87171'} status={(d.macdHist || 0) >= 0 ? 'Bullish' : 'Bearish'} />
                <Metric label="ADX" value={(d.adx || 0).toFixed(1)} {...adx} />
                <Metric label="BB%" value={(d.bbPct || 0).toFixed(2)} {...bb} />
                <Metric label="EMA Cross" value={d.ema9Above21 ? 'YES' : 'NO'} color={d.ema9Above21 ? '#34d399' : '#f87171'} status={d.ema9Above21 ? 'Uptrend' : 'Downtrend'} />
                <Metric label="Volume" value={(d.volumeRatio || 0).toFixed(2) + '\u00D7'} {...vol} />
                <Metric label="ATR %" value={(d.atrPct || 0).toFixed(2) + '%'} color="#f0f0f8" status="Volatility" />
                <Metric label="OBV" value={d.obvAboveEma ? 'UP' : 'DOWN'} color={d.obvAboveEma ? '#34d399' : '#f87171'} status={d.obvAboveEma ? 'Accumulation' : 'Distribution'} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Metric({ label, value, color, status }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>{label}</div>
      <div className="tabular" style={{ ...mono, fontSize: 22, fontWeight: 500, color }}>{value}</div>
      {status && <div style={{ ...mono, fontSize: 11, color, opacity: 0.6, marginTop: 3 }}>{status}</div>}
    </div>
  )
}
