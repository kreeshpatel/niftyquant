import React, { useEffect, useState } from 'react'
import { fetchStockDetail } from '../api'
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const m = { fontFamily: 'var(--mono)' }
const s = { fontFamily: 'var(--sans)' }
const sep = { borderBottom: '1px solid rgba(255,255,255,0.05)' }
const dimLabel = { ...m, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }

function rsiInfo(v) { return v > 70 ? { c: '#f87171', s: 'Overbought' } : v > 50 ? { c: '#34d399', s: 'Bullish' } : v > 30 ? { c: '#fbbf24', s: 'Neutral' } : { c: '#60a5fa', s: 'Oversold' } }
function adxInfo(v) { return v > 30 ? { c: '#34d399', s: 'Strong' } : v > 20 ? { c: '#fbbf24', s: 'Moderate' } : { c: '#f87171', s: 'Weak' } }
function bbInfo(v) { return v > 0.8 ? { c: '#f87171', s: 'Upper band' } : v > 0.2 ? { c: '#fbbf24', s: 'Mid range' } : { c: '#34d399', s: 'Lower band' } }
function volInfo(v) { return v > 2 ? { c: '#34d399', s: 'High' } : v > 1 ? { c: '#fbbf24', s: 'Normal' } : { c: '#f87171', s: 'Low' } }

function relTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  const d = pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
  return <div style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 12px rgba(0,0,0,0.9)', pointerEvents: 'none' }}>{'\u20B9'}{pt?.close?.toLocaleString('en-IN')} · {d}</div>
}

export default function StockPanel({ ticker, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setNewsLoading(true)
    fetchStockDetail(ticker).then(d => { setData(d); setLoading(false) })
    fetch(`/api/news?ticker=${ticker}`)
      .then(r => r.ok ? r.json() : { news: [] })
      .then(d => { setNews(d.news || []); setNewsLoading(false) })
      .catch(() => { setNews([]); setNewsLoading(false) })
  }, [ticker])

  if (!ticker) return null
  const d = data || {}
  const pos52 = d.posIn52w || 0
  const spark = d.sparkline || []
  const ret30 = spark.length >= 2 ? ((spark[spark.length - 1].close / spark[0].close - 1) * 100) : 0
  const accent = ret30 >= 0 ? '#818cf8' : '#f87171'
  const rsi = rsiInfo(d.rsi || 0), adx = adxInfo(d.adx || 0), bb = bbInfo(d.bbPct || 0), vol = volInfo(d.volumeRatio || 0)

  let sigColor, sigTitle, sigSub
  if (d.hybridSignal === 1) { sigColor = '#34d399'; sigTitle = 'BUY OPPORTUNITY'; sigSub = `Dip conviction: ${d.dipConviction || 'high'} · Momentum regime active` }
  else if (d.inMomentum === 1) { sigColor = '#fbbf24'; sigTitle = 'ON WATCHLIST · WAITING FOR DIP'; sigSub = 'Stock in uptrend · no dip signal yet' }
  else {
    sigColor = 'rgba(255,255,255,0.08)'
    sigTitle = 'NOT IN WATCHLIST'
    const r = []
    if ((d.adx || 0) <= 25) r.push(`ADX ${(d.adx || 0).toFixed(0)} < 22 required`)
    if (pos52 <= 0.5) r.push(`52w position ${(pos52 * 100).toFixed(0)}% < 50% required`)
    sigSub = r.join(' · ') || 'Momentum conditions not met'
  }

  const stg = i => ({ animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 40}ms` })
  const rangeAccent = pos52 > 0.6 ? '#34d399' : pos52 < 0.4 ? '#fbbf24' : 'white'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9998, animation: 'fadeIn 0.2s ease both' }} />
      <div style={{
        position: 'fixed', top: '6%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(720px, 94vw)', maxHeight: '88vh', overflowY: 'auto',
        background: '#09090f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
        boxShadow: '0 40px 120px rgba(0,0,0,0.7)', zIndex: 9999,
        animation: 'panelIn 280ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Close */}
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', zIndex: 2, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>&times;</div>

        {loading ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Loading...</div>
        : !data ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Stock not found</div>
        : <>
          {/* ── HEADER ── */}
          <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', ...stg(0) }}>
            <div>
              <div style={{ ...m, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 12 }}>{d.sector}</div>
              <div style={{ ...s, fontSize: 42, fontWeight: 800, letterSpacing: -2, color: '#fff', lineHeight: 1, marginBottom: 2 }}>{d.ticker}</div>
              <div style={{ ...s, fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>{d.name}</div>
            </div>
            <div style={{ textAlign: 'right', alignSelf: 'flex-start', paddingTop: 28 }}>
              <div className="tabular" style={{ ...m, fontSize: 42, fontWeight: 400, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  ...m, fontSize: 13, fontWeight: 500,
                  color: d.dayChange >= 0 ? '#34d399' : '#f87171',
                  background: d.dayChange >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                  padding: '4px 10px', borderRadius: 20,
                }}>{d.dayChange >= 0 ? '\u2191' : '\u2193'} {d.dayChange >= 0 ? '+' : ''}{d.dayChange}% today</span>
              </div>
            </div>
          </div>

          {/* ── CHART ── */}
          {spark.length > 5 && <div style={{ margin: '20px 0 0', ...stg(1) }}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={spark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`sf-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="close" stroke={accent} strokeWidth={2} fill={`url(#sf-${ticker})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 24px 20px', ...sep }}>
              <span style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>30 days</span>
              <span style={{ ...m, fontSize: 12, fontWeight: 500, color: ret30 >= 0 ? '#34d399' : '#f87171' }}>
                {ret30 >= 0 ? '\u2191' : '\u2193'} {ret30 >= 0 ? '+' : ''}{ret30.toFixed(1)}%
              </span>
            </div>
          </div>}

          {/* ── 52-WEEK RANGE ── */}
          <div style={{ padding: '20px 24px', ...sep, ...stg(2) }}>
            <div style={{ ...dimLabel, marginBottom: 12 }}>52-week range</div>
            <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '10px 0' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2, width: `${Math.min(pos52 * 100, 30)}%`, background: 'rgba(248,113,113,0.4)' }} />
              <div style={{ position: 'absolute', left: '30%', top: 0, height: '100%', width: `${Math.max(Math.min(pos52 * 100 - 30, 40), 0)}%`, background: 'rgba(255,255,255,0.15)' }} />
              <div style={{ position: 'absolute', left: '70%', top: 0, height: '100%', width: `${Math.max(pos52 * 100 - 70, 0)}%`, background: 'rgba(52,211,153,0.4)', borderRadius: '0 2px 2px 0' }} />
              <div style={{
                position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: 'white',
                border: '2px solid #09090f', boxShadow: `0 0 0 2px ${rangeAccent}, 0 2px 8px rgba(0,0,0,0.4)`,
                top: -5.5, left: `${pos52 * 100}%`, transform: 'translateX(-50%)',
                transition: 'left 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...m, fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'\u20B9'}{d.low52w?.toLocaleString('en-IN')}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'\u20B9'}{d.high52w?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* ── SIGNAL STATUS ── */}
          <div style={{ padding: '20px 24px', ...sep, ...stg(3) }}>
            <div style={{ borderLeft: `3px solid ${sigColor}`, paddingLeft: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...m, fontSize: 13, fontWeight: 700, color: sigColor === 'rgba(255,255,255,0.08)' ? 'rgba(255,255,255,0.3)' : sigColor }}>{sigTitle}</div>
                {d.hybridSignal === 1 && <span style={{ ...m, fontSize: 9, padding: '3px 8px', borderRadius: 12, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>ML {((d.mlScore || 0.6) * 100).toFixed(0)}%</span>}
              </div>
              <div style={{ ...m, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sigSub}</div>

              {/* Inline trade plan for BUY */}
              {d.hybridSignal === 1 && d.atr14 > 0 && (() => {
                const entry = Math.round(d.close * 1.002 * 100) / 100
                const stop = Math.round((entry - 1.5 * d.atr14) * 100) / 100
                const target = Math.round((entry + 3.0 * d.atr14) * 100) / 100
                const risk = Math.round((entry - stop) * (150000 / entry))
                const rr = ((target - entry) / (entry - stop)).toFixed(1)
                return <>
                  <div style={{ ...m, fontSize: 14, fontWeight: 500, marginTop: 12 }}>
                    <span style={{ color: '#fbbf24' }}>{'\u20B9'}{entry.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 8px' }}>{'\u2192'}</span>
                    <span style={{ color: '#34d399' }}>{'\u20B9'}{target.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 8px' }}>|</span>
                    <span style={{ color: '#f87171' }}>Stop {'\u20B9'}{stop.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>~8 days · {'\u20B9'}{risk.toLocaleString('en-IN')} risk · R:R {rr}</div>
                </>
              })()}
            </div>
          </div>

          {/* ── KEY METRICS ── */}
          <div style={{ padding: '20px 24px', ...sep, ...stg(4) }}>
            <div style={{ ...dimLabel, marginBottom: 16 }}>Key metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                ['RSI (14)', (d.rsi || 0).toFixed(1), rsi.c, rsi.s, (d.rsi || 0)],
                ['MACD', (d.macdHist || 0).toFixed(2), (d.macdHist || 0) >= 0 ? '#34d399' : '#f87171', (d.macdHist || 0) >= 0 ? 'Bullish' : 'Bearish'],
                ['ADX', (d.adx || 0).toFixed(1), adx.c, adx.s],
                ['BB%', (d.bbPct || 0).toFixed(2), bb.c, bb.s],
                ['EMA Cross', d.ema9Above21 ? '\u2713 YES' : '\u2717 NO', d.ema9Above21 ? '#34d399' : '#f87171', d.ema9Above21 ? 'Uptrend' : 'Downtrend'],
                ['Volume', (d.volumeRatio || 0).toFixed(2) + '\u00D7', vol.c, vol.s],
                ['ATR %', (d.atrPct || 0).toFixed(2) + '%', '#f0f0f8', 'Volatility'],
                ['OBV', d.obvAboveEma ? 'UP' : 'DOWN', d.obvAboveEma ? '#34d399' : '#f87171', d.obvAboveEma ? 'Accumulation' : 'Distribution'],
              ].map(([label, value, color, status, rsiVal], i) => (
                <div key={label} style={{
                  padding: '14px 16px 14px 0', paddingLeft: i % 4 !== 0 ? 16 : 0,
                  borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  borderRight: i % 4 !== 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ ...m, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>{label}</div>
                  <div className="tabular" style={{ ...m, fontSize: 20, fontWeight: 500, color }}>{value}</div>
                  {label === 'RSI (14)' && <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 6, width: '100%' }}>
                    <div style={{ height: '100%', width: `${Math.min(rsiVal || 0, 100)}%`, background: color, borderRadius: 1 }} />
                  </div>}
                  {status && label !== 'RSI (14)' && <div style={{ ...m, fontSize: 10, color, opacity: 0.6, marginTop: 3 }}>{status}</div>}
                  {label === 'RSI (14)' && status && <div style={{ ...m, fontSize: 10, color, opacity: 0.6, marginTop: 3 }}>{status}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* ── NEWS ── */}
          <div style={{ padding: '20px 24px 24px', ...stg(5) }}>
            <div style={{ ...dimLabel, marginBottom: 16 }}>Latest news</div>
            {newsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
              </div>
            ) : news.length === 0 ? (
              <div style={{ ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>No recent news found</div>
            ) : news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', padding: '14px 8px', textDecoration: 'none',
                borderBottom: i < news.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderRadius: 8, transition: 'background 0.15s', cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...m, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{n.source}</span>
                  <span style={{ ...m, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{relTime(n.published)}</span>
                </div>
                <div style={{ ...s, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
                {n.summary && n.summary !== n.title && <div style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.summary}</div>}
              </a>
            ))}
          </div>
        </>}
      </div>
    </>
  )
}
