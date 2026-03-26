import React, { useEffect, useState } from 'react'
import { fetchStockDetail } from '../api'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

const m = { fontFamily: 'var(--mono)' }
const s = { fontFamily: 'var(--sans)' }
const lbl = { ...m, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }

function rsiInfo(v) { return v > 70 ? { c: '#f87171', s: 'Overbought' } : v > 50 ? { c: '#34d399', s: 'Bullish' } : v > 30 ? { c: '#fbbf24', s: 'Neutral' } : { c: '#60a5fa', s: 'Oversold' } }
function adxInfo(v) { return v > 30 ? { c: '#34d399', s: 'Strong' } : v > 20 ? { c: '#fbbf24', s: 'Moderate' } : { c: '#f87171', s: 'Weak' } }
function bbInfo(v) { return v > 0.8 ? { c: '#f87171', s: 'Upper band' } : v > 0.2 ? { c: '#fbbf24', s: 'Mid range' } : { c: '#34d399', s: 'Lower band' } }
function volInfo(v) { return v > 2 ? { c: '#34d399', s: 'High' } : v > 1 ? { c: '#fbbf24', s: 'Normal' } : { c: '#f87171', s: 'Low' } }

function relTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const SOURCE_DOTS = {
  'Economic Times': '#f59e0b', 'ET': '#f59e0b', 'Moneycontrol': '#3b82f6',
  'Business Standard': '#818cf8', 'Reuters': '#ef4444', 'Livemint': '#10b981',
  'NDTV': '#ec4899', 'Bloomberg': '#f97316', 'CNBC': '#06b6d4',
}
function srcDot(source) { return SOURCE_DOTS[source] || Object.entries(SOURCE_DOTS).find(([k]) => (source || '').includes(k))?.[1] || 'rgba(255,255,255,0.3)' }

function metricBg(color) {
  if (color === '#34d399' || color === '#10b981') return 'rgba(52,211,153,0.04)'
  if (color === '#f87171' || color === '#ef4444') return 'rgba(248,113,113,0.04)'
  if (color === '#fbbf24') return 'rgba(251,191,36,0.03)'
  if (color === '#60a5fa') return 'rgba(96,165,250,0.04)'
  return 'rgba(255,255,255,0.02)'
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  const dt = pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
  return <div style={{ ...m, fontSize: 12, color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 16px rgba(0,0,0,0.95)', fontWeight: 500 }}>{'\u20B9'}{pt?.close?.toLocaleString('en-IN')} · {dt}</div>
}

export default function StockPanel({ ticker, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setNewsLoading(true)
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
  const headerGrad = ret30 >= 0
    ? 'linear-gradient(180deg, rgba(129,140,248,0.12) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(248,113,113,0.10) 0%, transparent 100%)'
  const rsi = rsiInfo(d.rsi || 0), adx = adxInfo(d.adx || 0), bb = bbInfo(d.bbPct || 0), vol = volInfo(d.volumeRatio || 0)
  const rangeAccent = pos52 > 0.6 ? '#34d399' : pos52 < 0.4 ? '#fbbf24' : 'white'

  let sigColor, sigTitle, sigSub, sigIcon
  if (d.hybridSignal === 1) { sigColor = '#34d399'; sigTitle = 'BUY OPPORTUNITY'; sigSub = `Dip conviction: ${d.dipConviction || 'high'} · Momentum regime active`; sigIcon = '\u25CF' }
  else if (d.inMomentum === 1) { sigColor = '#fbbf24'; sigTitle = 'ON WATCHLIST'; sigSub = 'Stock in uptrend · waiting for dip entry'; sigIcon = '\u25CE' }
  else {
    sigColor = 'rgba(255,255,255,0.1)'; sigTitle = 'NOT IN WATCHLIST'; sigIcon = '\u2014'
    const r = []
    if ((d.adx || 0) <= 25) r.push(`ADX ${(d.adx || 0).toFixed(0)} < 22`)
    if (pos52 <= 0.5) r.push(`52w ${(pos52 * 100).toFixed(0)}% < 50%`)
    sigSub = r.join(' · ') || 'Momentum conditions not met'
  }

  const stg = i => ({ animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 40}ms` })

  const metrics = [
    { l: 'RSI (14)', v: (d.rsi || 0).toFixed(1), c: rsi.c, st: rsi.s, bar: d.rsi || 0 },
    { l: 'MACD', v: (d.macdHist || 0).toFixed(2), c: (d.macdHist || 0) >= 0 ? '#34d399' : '#f87171', st: (d.macdHist || 0) >= 0 ? 'Bullish' : 'Bearish' },
    { l: 'ADX', v: (d.adx || 0).toFixed(1), c: adx.c, st: adx.s },
    { l: 'BB%', v: (d.bbPct || 0).toFixed(2), c: bb.c, st: bb.s },
    { l: 'EMA Cross', v: d.ema9Above21 ? '\u2713 YES' : '\u2717 NO', c: d.ema9Above21 ? '#34d399' : '#f87171', st: d.ema9Above21 ? 'Uptrend' : 'Downtrend' },
    { l: 'Volume', v: (d.volumeRatio || 0).toFixed(2) + '\u00D7', c: vol.c, st: vol.s },
    { l: 'ATR %', v: (d.atrPct || 0).toFixed(2) + '%', c: '#f0f0f8', st: 'Volatility' },
    { l: 'OBV', v: d.obvAboveEma ? 'UP' : 'DOWN', c: d.obvAboveEma ? '#34d399' : '#f87171', st: d.obvAboveEma ? 'Accumulation' : 'Distribution' },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9998, animation: 'fadeIn 0.2s ease both' }} />
      <div style={{
        position: 'fixed', top: '6%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(720px, 94vw)', maxHeight: '88vh', overflowY: 'auto',
        background: '#09090f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 9999, animation: 'panelIn 280ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Close */}
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', zIndex: 2, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>&times;</div>

        {loading ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Loading...</div>
        : !data ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Stock not found</div>
        : <>
          {/* ── HEADER + CHART (layered) ── */}
          <div style={{ position: 'relative' }}>
            {/* Header gradient bg */}
            <div style={{ position: 'absolute', inset: 0, height: 280, background: headerGrad, pointerEvents: 'none', borderRadius: '20px 20px 0 0' }} />

            {/* Header content */}
            <div style={{ position: 'relative', padding: '24px 26px 0', display: 'flex', justifyContent: 'space-between', ...stg(0) }}>
              <div>
                <div style={{ ...m, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 10 }}>{d.sector}</div>
                <div style={{ ...s, fontSize: 56, fontWeight: 800, letterSpacing: -2.5, color: '#fff', lineHeight: 1 }}>{d.ticker}</div>
                <div style={{ ...s, fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{d.name}</div>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'flex-start', paddingTop: 24 }}>
                <div className="tabular" style={{ ...m, fontSize: 42, fontWeight: 400, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ ...m, fontSize: 13, fontWeight: 500, color: d.dayChange >= 0 ? '#34d399' : '#f87171', background: d.dayChange >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                    {d.dayChange >= 0 ? '\u2191' : '\u2193'} {d.dayChange >= 0 ? '+' : ''}{d.dayChange}% today
                  </span>
                </div>
              </div>
            </div>

            {/* Chart — bleeds into header */}
            {spark.length > 5 && <div style={{ position: 'relative', marginTop: -8, ...stg(1) }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={spark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`sf-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeDasharray: '4 3' }} />
                  <Area type="monotone" dataKey="close" stroke={accent} strokeWidth={2} fill={`url(#sf-${ticker})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>}
          </div>

          {/* Chart footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>30 days</span>
            <span style={{ ...m, fontSize: 12, fontWeight: 500, color: ret30 >= 0 ? '#34d399' : '#f87171' }}>
              {ret30 >= 0 ? '\u2191' : '\u2193'} {ret30 >= 0 ? '+' : ''}{ret30.toFixed(1)}%
            </span>
          </div>

          {/* ── 52-WEEK RANGE ── */}
          <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stg(2) }}>
            <div style={{ ...lbl, marginBottom: 12 }}>52-week range</div>
            <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '10px 0' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '30%', background: 'rgba(248,113,113,0.35)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute', left: '30%', top: 0, height: '100%', width: '40%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', left: '70%', top: 0, height: '100%', width: '30%', background: 'rgba(52,211,153,0.35)', borderRadius: '0 2px 2px 0' }} />
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
          <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stg(3) }}>
            <div style={{
              background: d.hybridSignal === 1 ? 'rgba(52,211,153,0.08)' : d.inMomentum === 1 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
              borderLeft: `${d.hybridSignal === 1 ? 3 : 2}px solid ${sigColor}`,
              borderRadius: '0 10px 10px 0', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: sigColor === 'rgba(255,255,255,0.1)' ? 'rgba(255,255,255,0.2)' : sigColor, fontSize: 14, ...(d.hybridSignal === 1 ? { animation: 'pulse 2s infinite' } : {}) }}>{sigIcon}</span>
                <span style={{ ...m, fontSize: 13, fontWeight: 700, color: sigColor === 'rgba(255,255,255,0.1)' ? 'rgba(255,255,255,0.3)' : sigColor }}>{sigTitle}</span>
                {d.hybridSignal === 1 && <span style={{ marginLeft: 'auto', ...m, fontSize: 9, padding: '3px 8px', borderRadius: 12, background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>ML {((d.mlScore || 0.6) * 100).toFixed(0)}%</span>}
              </div>
              <div style={{ ...m, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, paddingLeft: 22 }}>{sigSub}</div>

              {d.hybridSignal === 1 && d.atr14 > 0 && (() => {
                const entry = Math.round(d.close * 1.002 * 100) / 100
                const stop = Math.round((entry - 1.5 * d.atr14) * 100) / 100
                const target = Math.round((entry + 3.0 * d.atr14) * 100) / 100
                const risk = Math.round((entry - stop) * (150000 / entry))
                const rr = ((target - entry) / (entry - stop)).toFixed(1)
                return <div style={{ marginTop: 12, paddingLeft: 22 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[['Entry', entry, '#fbbf24'], ['Stop', stop, '#f87171'], ['Target', target, '#34d399']].map(([l, v, c]) => (
                      <span key={l} style={{ ...m, fontSize: 12, padding: '4px 10px', borderRadius: 8, background: `${c}15`, color: c, fontWeight: 500 }}>{l} {'\u20B9'}{v.toLocaleString('en-IN')}</span>
                    ))}
                  </div>
                  <div style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>~8 days · {'\u20B9'}{risk.toLocaleString('en-IN')} risk · R:R {rr}</div>
                </div>
              })()}
            </div>
          </div>

          {/* ── KEY METRICS ── */}
          <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...stg(4) }}>
            <div style={{ ...lbl, marginBottom: 14 }}>Key metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {metrics.map((mt, i) => (
                <div key={mt.l} style={{ background: metricBg(mt.c), borderRadius: 10, padding: '14px 12px' }}>
                  <div style={{ ...m, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>{mt.l}</div>
                  <div className="tabular" style={{ ...m, fontSize: 20, fontWeight: 500, color: mt.c }}>{mt.v}</div>
                  {mt.bar != null && <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1.5, marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${Math.min(mt.bar, 100)}%`, background: mt.c, borderRadius: 1.5, transition: 'width 0.6s ease' }} />
                  </div>}
                  {mt.st && <div style={{ ...m, fontSize: 10, color: mt.c, opacity: 0.6, marginTop: mt.bar != null ? 4 : 3 }}>{mt.st}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* ── NEWS ── */}
          <div style={{ padding: '22px 26px 26px', ...stg(5) }}>
            <div style={{ ...lbl, marginBottom: 14 }}>Latest news</div>
            {newsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />)}
              </div>
            ) : news.length === 0 ? (
              <div style={{ ...m, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>No recent news found</div>
            ) : news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', padding: '14px 12px', textDecoration: 'none', borderRadius: 10,
                borderBottom: i < news.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: srcDot(n.source), flexShrink: 0 }} />
                  <span style={{ ...m, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{n.source}</span>
                  <span style={{ ...m, fontSize: 9, color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>{relTime(n.published)}</span>
                </div>
                <div style={{ ...s, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
                {n.summary && n.summary !== n.title && <div style={{ ...m, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.summary}</div>}
              </a>
            ))}
          </div>
        </>}
      </div>
    </>
  )
}
