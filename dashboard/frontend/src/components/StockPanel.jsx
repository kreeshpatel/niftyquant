import React, { useEffect, useState } from 'react'
import { fetchStockDetail } from '../api'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function MetricBox({ label, value, status, color }) {
  return (
    <div style={{
      background: '#ffffff05', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color }}>{value}</div>
      {status && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color, marginTop: 4, opacity: 0.8 }}>{status}</div>}
    </div>
  )
}

function rsiInfo(v) {
  if (v > 70) return { color: 'var(--red)', status: 'Overbought' }
  if (v > 50) return { color: 'var(--green)', status: 'Bullish' }
  if (v > 30) return { color: 'var(--amber)', status: 'Neutral' }
  return { color: 'var(--blue)', status: 'Oversold' }
}
function adxInfo(v) {
  if (v > 30) return { color: 'var(--green)', status: 'Strong trend' }
  if (v > 20) return { color: 'var(--amber)', status: 'Moderate' }
  return { color: 'var(--red)', status: 'Weak/choppy' }
}
function bbInfo(v) {
  if (v > 0.8) return { color: 'var(--red)', status: 'Near upper band' }
  if (v > 0.2) return { color: 'var(--amber)', status: 'Mid range' }
  return { color: 'var(--green)', status: 'Near lower band' }
}
function volInfo(v) {
  if (v > 2) return { color: 'var(--green)', status: 'High volume' }
  if (v > 1) return { color: 'var(--amber)', status: 'Normal' }
  return { color: 'var(--red)', status: 'Low volume' }
}

export default function StockPanel({ ticker, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchStockDetail(ticker).then(d => { setData(d); setLoading(false) })
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

  // Dip status
  let dipBg, dipBorder, dipColor, dipTitle, dipSub
  if (d.hybridSignal === 1) {
    dipBg = 'var(--green-bg)'; dipBorder = 'var(--green-border)'; dipColor = 'var(--green)'
    dipTitle = 'BUY OPPORTUNITY DETECTED'; dipSub = `Dip conviction: ${d.dipConviction} · Momentum regime active`
  } else if (d.inMomentum === 1) {
    dipBg = 'var(--amber-bg)'; dipBorder = 'var(--amber-border)'; dipColor = 'var(--amber)'
    dipTitle = 'ON WATCHLIST \u2014 WAITING FOR DIP'; dipSub = 'Stock is in uptrend · No dip signal yet'
  } else {
    dipBg = '#ffffff05'; dipBorder = 'var(--border)'; dipColor = 'var(--text-dim)'
    dipTitle = 'NOT IN WATCHLIST'
    const reasons = []
    if (d.adx <= 25) reasons.push(`ADX too low (${(d.adx||0).toFixed(0)} < 25)`)
    if (pos52 <= 0.5) reasons.push(`Not in upper 52w range (${(pos52*100).toFixed(0)}%)`)
    dipSub = reasons.join(' · ') || 'Momentum conditions not met'
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: '#00000070', backdropFilter: 'blur(4px)', zIndex: 9998,
      }} />
      <div style={{
        position: 'fixed', top: '10%', left: '50%',
        width: 'min(780px, 90vw)', maxHeight: '80vh', overflowY: 'auto',
        background: '#111114', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 40px 120px #00000080', zIndex: 9999,
        animation: 'panelIn 200ms ease-out',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>Loading...</div>
        ) : !data ? (
          <div style={{ padding: 60, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>Stock data not found</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>{d.ticker}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{d.name}</div>
                <span style={{
                  display: 'inline-block', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: 'var(--purple-bg)', color: 'var(--purple)', padding: '3px 10px', borderRadius: 20,
                }}>{d.sector}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div onClick={onClose} style={{
                  cursor: 'pointer', fontSize: 20, color: 'var(--text-dim)', width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)', background: '#ffffff08', border: '1px solid var(--border)',
                  marginBottom: 8, transition: 'background 0.15s',
                }} onMouseEnter={e => e.currentTarget.style.background = '#ffffff15'}
                   onMouseLeave={e => e.currentTarget.style.background = '#ffffff08'}>&times;</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500 }}>{d.close?.toLocaleString('en-IN')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: d.dayChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {d.dayChange >= 0 ? '+' : ''}{d.dayChange}% today
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 28px 28px' }}>
              {/* 52-week range */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 10 }}>52-week range</div>
                <div style={{ position: 'relative', height: 6, background: '#ffffff08', borderRadius: 3 }}>
                  <div style={{
                    position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: 'var(--purple)',
                    top: -3, left: `${pos52 * 100}%`, transform: 'translateX(-50%)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{d.low52w?.toLocaleString('en-IN')}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{d.close?.toLocaleString('en-IN')} today</span>
                  <span style={{ color: 'var(--text-dim)' }}>{d.high52w?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                <MetricBox label="RSI" value={(d.rsi||0).toFixed(1)} {...rsi} />
                <MetricBox label="MACD" value={(d.macdHist||0).toFixed(2)} color={d.macdHist >= 0 ? 'var(--green)' : 'var(--red)'} status={d.macdHist >= 0 ? 'Bullish' : 'Bearish'} />
                <MetricBox label="ADX" value={(d.adx||0).toFixed(1)} {...adx} />
                <MetricBox label="BB%" value={(d.bbPct||0).toFixed(2)} {...bb} />
                <MetricBox label="EMA9 > EMA21" value={d.ema9Above21 ? 'YES' : 'NO'} color={d.ema9Above21 ? 'var(--green)' : 'var(--red)'} status={d.ema9Above21 ? 'Uptrend' : 'Downtrend'} />
                <MetricBox label="Volume" value={(d.volumeRatio||0).toFixed(2) + 'x'} {...vol} />
                <MetricBox label="ATR %" value={(d.atrPct||0).toFixed(2) + '%'} color="var(--text-primary)" />
                <MetricBox label="OBV Trend" value={d.obvAboveEma ? 'UP' : 'DOWN'} color={d.obvAboveEma ? 'var(--green)' : 'var(--red)'} status={d.obvAboveEma ? 'Accumulation' : 'Distribution'} />
              </div>

              {/* Dip signal status */}
              <div style={{
                background: dipBg, border: `1px solid ${dipBorder}`, borderLeft: `4px solid ${dipColor}`,
                borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20,
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: dipColor }}>{dipTitle}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{dipSub}</div>
              </div>

              {/* Trade plan (if signal) */}
              {d.hybridSignal === 1 && d.atr14 > 0 && (() => {
                const entry = Math.round(d.close * 1.002 * 100) / 100
                const stop = Math.round((entry - 1.5 * d.atr14) * 100) / 100
                const target = Math.round((entry + 3.0 * d.atr14) * 100) / 100
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[['ENTRY', entry, 'var(--amber)'], ['STOP', stop, 'var(--red)'], ['TARGET', target, 'var(--green)']].map(([l, v, c]) => (
                      <div key={l} style={{ background: '#ffffff05', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: c }}>{v.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* 30-day sparkline */}
              {sparkData.length > 5 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 8 }}>30-day price</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <ComposedChart data={sparkData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload
                        return <div style={{ background: '#111113', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                          <div style={{ color: 'var(--text-dim)' }}>{d?.date}</div>
                          <div style={{ color: 'var(--purple)' }}>{d?.close?.toLocaleString('en-IN')}</div>
                        </div>
                      }} />
                      <Area type="monotone" dataKey="close" stroke="none" fill="url(#sparkGrad)" />
                      <Line type="monotone" dataKey="close" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ret30 >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
                    30-day return: {ret30 >= 0 ? '+' : ''}{ret30.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
