import React, { useEffect, useState } from 'react'
import { fetchStockDetail } from '../api'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

const m = { fontFamily: 'var(--mono)' }
const s = { fontFamily: 'var(--sans)' }
const lbl = { ...m, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }

function rsiInfo(v) { return v > 70 ? { c: '#FF453A', s: 'Overbought' } : v > 50 ? { c: '#00C896', s: 'Bullish' } : v > 30 ? { c: '#FF9F0A', s: 'Neutral' } : { c: '#0A84FF', s: 'Oversold' } }
function adxInfo(v) { return v > 30 ? { c: '#00C896', s: 'Strong' } : v > 20 ? { c: '#FF9F0A', s: 'Moderate' } : { c: '#FF453A', s: 'Weak' } }
function bbInfo(v) { return v > 0.8 ? { c: '#FF453A', s: 'Upper band' } : v > 0.2 ? { c: '#FF9F0A', s: 'Mid range' } : { c: '#00C896', s: 'Lower band' } }
function volInfo(v) { return v > 2 ? { c: '#00C896', s: 'High' } : v > 1 ? { c: '#FF9F0A', s: 'Normal' } : { c: '#FF453A', s: 'Low' } }

function relTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const SOURCE_DOTS = {
  'Economic Times': '#FF9F0A', 'ET': '#FF9F0A', 'Moneycontrol': '#0A84FF',
  'Business Standard': '#BF5AF2', 'Reuters': '#FF453A', 'Livemint': '#00C896',
  'NDTV': '#FF453A', 'Bloomberg': '#FF9F0A', 'CNBC': '#64D2FF',
}
function srcDot(source) { return SOURCE_DOTS[source] || Object.entries(SOURCE_DOTS).find(([k]) => (source || '').includes(k))?.[1] || 'var(--text-muted)' }

function metricBg(color) {
  if (color === '#00C896') return 'rgba(0,200,150,0.04)'
  if (color === '#FF453A') return 'rgba(255,69,58,0.04)'
  if (color === '#FF9F0A') return 'rgba(255,159,10,0.03)'
  if (color === '#0A84FF') return 'rgba(10,132,255,0.04)'
  return 'rgba(255,255,255,0.02)'
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  const dt = pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
  return <div style={{ ...m, fontSize: 13, color: 'var(--text-primary)', textShadow: '0 2px 16px rgba(0,0,0,0.95)', fontWeight: 500 }}>{'\u20B9'}{pt?.close?.toLocaleString('en-IN')} · {dt}</div>
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
  const accent = ret30 >= 0 ? '#00C896' : '#FF453A'
  const headerGrad = ret30 >= 0
    ? 'linear-gradient(180deg, rgba(0,200,150,0.08) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(255,69,58,0.06) 0%, transparent 100%)'
  const rsi = rsiInfo(d.rsi || 0), adx = adxInfo(d.adx || 0), bb = bbInfo(d.bbPct || 0), vol = volInfo(d.volumeRatio || 0)
  const rangeAccent = pos52 > 0.6 ? '#00C896' : pos52 < 0.4 ? '#FF9F0A' : '#f5f5f7'

  let sigColor, sigTitle, sigSub, sigIcon
  if (d.hybridSignal === 1) { sigColor = '#00C896'; sigTitle = 'BUY OPPORTUNITY'; sigSub = `Dip conviction: ${d.dipConviction || 'high'} · Momentum regime active`; sigIcon = '\u25CF' }
  else if (d.inMomentum === 1) { sigColor = '#FF9F0A'; sigTitle = 'ON WATCHLIST'; sigSub = 'Stock in uptrend · waiting for dip entry'; sigIcon = '\u25CE' }
  else {
    sigColor = 'var(--text-muted)'; sigTitle = 'NOT IN WATCHLIST'; sigIcon = '\u2014'
    const r = []
    if ((d.adx || 0) <= 25) r.push(`ADX ${(d.adx || 0).toFixed(0)} < 22`)
    if (pos52 <= 0.5) r.push(`52w ${(pos52 * 100).toFixed(0)}% < 50%`)
    sigSub = r.join(' · ') || 'Momentum conditions not met'
  }

  const stg = i => ({ animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 40}ms` })

  const metrics = [
    { l: 'RSI (14)', v: (d.rsi || 0).toFixed(1), c: rsi.c, st: rsi.s, bar: d.rsi || 0 },
    { l: 'MACD', v: (d.macdHist || 0).toFixed(2), c: (d.macdHist || 0) >= 0 ? '#00C896' : '#FF453A', st: (d.macdHist || 0) >= 0 ? 'Bullish' : 'Bearish' },
    { l: 'ADX', v: (d.adx || 0).toFixed(1), c: adx.c, st: adx.s },
    { l: 'BB%', v: (d.bbPct || 0).toFixed(2), c: bb.c, st: bb.s },
    { l: 'EMA Cross', v: d.ema9Above21 ? '\u2713 YES' : '\u2717 NO', c: d.ema9Above21 ? '#00C896' : '#FF453A', st: d.ema9Above21 ? 'Uptrend' : 'Downtrend' },
    { l: 'Volume', v: (d.volumeRatio || 0).toFixed(2) + '\u00D7', c: vol.c, st: vol.s },
    { l: 'ATR %', v: (d.atrPct || 0).toFixed(2) + '%', c: '#f5f5f7', st: 'Volatility' },
    { l: 'OBV', v: d.obvAboveEma ? 'UP' : 'DOWN', c: d.obvAboveEma ? '#00C896' : '#FF453A', st: d.obvAboveEma ? 'Accumulation' : 'Distribution' },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 9998, animation: 'fadeIn 0.2s ease both' }} />
      <div style={{
        position: 'fixed', top: '6%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(720px, 94vw)', maxHeight: '88vh', overflowY: 'auto',
        background: 'var(--bg-base)', border: '0.5px solid var(--border-default)', borderRadius: 20,
        boxShadow: '0 0 0 0.5px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 9999, animation: 'panelIn 280ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Close */}
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s var(--ease-out)', zIndex: 2, color: 'var(--text-tertiary)', fontSize: 14 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}>&times;</div>

        {loading ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
        : !data ? <div style={{ padding: 80, textAlign: 'center', ...m, fontSize: 13, color: 'var(--text-muted)' }}>Stock not found</div>
        : <>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, height: 280, background: headerGrad, pointerEvents: 'none', borderRadius: '20px 20px 0 0' }} />
            <div style={{ position: 'relative', padding: '24px 26px 0', ...stg(0) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ ...m, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'var(--bg-glass)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{d.sector}</div>
              </div>
              <div style={{ ...s, fontSize: 'clamp(28px, 7vw, 48px)', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f7', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{d.ticker}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                <span className="tabular" style={{ ...m, fontSize: 28, fontWeight: 500, color: '#f5f5f7', letterSpacing: '-0.01em' }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</span>
                <span style={{ ...m, fontSize: 13, fontWeight: 500, color: d.dayChange >= 0 ? '#00C896' : '#FF453A', background: d.dayChange >= 0 ? 'rgba(0,200,150,0.1)' : 'rgba(255,69,58,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                  {d.dayChange >= 0 ? '\u2191' : '\u2193'} {d.dayChange >= 0 ? '+' : ''}{d.dayChange}% today
                </span>
              </div>
              <div style={{ ...s, fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>{d.name}</div>
            </div>

            {spark.length > 5 && <div style={{ position: 'relative', marginTop: -8, ...stg(1) }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={spark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`sf-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '4 3' }} />
                  <Area type="monotone" dataKey="close" stroke={accent} strokeWidth={2} strokeLinecap="round" fill={`url(#sf-${ticker})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 26px 18px', borderBottom: '0.5px solid var(--border-subtle)' }}>
            <span style={{ ...m, fontSize: 11, color: 'var(--text-muted)' }}>30 days</span>
            <span style={{ ...m, fontSize: 13, fontWeight: 500, color: ret30 >= 0 ? '#00C896' : '#FF453A' }}>
              {ret30 >= 0 ? '\u2191' : '\u2193'} {ret30 >= 0 ? '+' : ''}{ret30.toFixed(1)}%
            </span>
          </div>

          <div style={{ padding: '22px 26px', borderBottom: '0.5px solid var(--border-subtle)', ...stg(2) }}>
            <div style={{ ...lbl, marginBottom: 12 }}>52-week range</div>
            <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '10px 0' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '30%', background: 'rgba(255,69,58,0.25)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute', left: '30%', top: 0, height: '100%', width: '40%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', left: '70%', top: 0, height: '100%', width: '30%', background: 'rgba(0,200,150,0.25)', borderRadius: '0 2px 2px 0' }} />
              <div style={{
                position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#f5f5f7',
                border: '2px solid var(--bg-base)', boxShadow: `0 0 0 2px ${rangeAccent}, 0 2px 8px rgba(0,0,0,0.4)`,
                top: -5.5, left: `${pos52 * 100}%`, transform: 'translateX(-50%)',
                transition: 'left 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...m, fontSize: 11 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{'\u20B9'}{d.low52w?.toLocaleString('en-IN')}</span>
              <span style={{ color: '#f5f5f7', fontWeight: 500 }}>{'\u20B9'}{d.close?.toLocaleString('en-IN')}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{'\u20B9'}{d.high52w?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style={{ padding: '22px 26px', borderBottom: '0.5px solid var(--border-subtle)', ...stg(3) }}>
            <div style={{
              background: d.hybridSignal === 1 ? 'rgba(0,200,150,0.06)' : d.inMomentum === 1 ? 'rgba(255,159,10,0.04)' : 'var(--bg-glass)',
              borderLeft: `${d.hybridSignal === 1 ? 3 : 2}px solid ${sigColor}`,
              borderRadius: '0 12px 12px 0', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: sigColor === 'var(--text-muted)' ? 'var(--text-muted)' : sigColor, fontSize: 14, ...(d.hybridSignal === 1 ? { animation: 'pulse 2s infinite' } : {}) }}>{sigIcon}</span>
                <span style={{ ...m, fontSize: 13, fontWeight: 600, color: sigColor === 'var(--text-muted)' ? 'var(--text-tertiary)' : sigColor }}>{sigTitle}</span>
                {d.hybridSignal === 1 && <span style={{ marginLeft: 'auto', ...m, fontSize: 10, padding: '3px 8px', borderRadius: 12, background: 'rgba(0,200,150,0.1)', color: '#00C896', border: '0.5px solid rgba(0,200,150,0.2)', fontWeight: 500 }}>ML {((d.mlScore || 0.6) * 100).toFixed(0)}%</span>}
              </div>
              <div style={{ ...m, fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, paddingLeft: 22 }}>{sigSub}</div>

              {d.hybridSignal === 1 && d.atr14 > 0 && (() => {
                const entry = Math.round(d.close * 1.002 * 100) / 100
                const stop = Math.round((entry - 1.5 * d.atr14) * 100) / 100
                const target = Math.round((entry + 3.0 * d.atr14) * 100) / 100
                const risk = Math.round((entry - stop) * (150000 / entry))
                const rr = ((target - entry) / (entry - stop)).toFixed(1)
                return <div style={{ marginTop: 12, paddingLeft: 22 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[['Entry', entry, '#FF9F0A'], ['Stop', stop, '#FF453A'], ['Target', target, '#00C896']].map(([l, v, c]) => (
                      <span key={l} style={{ ...m, fontSize: 12, padding: '4px 10px', borderRadius: 8, background: `${c}12`, color: c, fontWeight: 500 }}>{l} {'\u20B9'}{v.toLocaleString('en-IN')}</span>
                    ))}
                  </div>
                  <div style={{ ...m, fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>~8 days · {'\u20B9'}{risk.toLocaleString('en-IN')} risk · R:R {rr}</div>
                </div>
              })()}
            </div>
          </div>

          <div style={{ padding: '22px 26px', borderBottom: '0.5px solid var(--border-subtle)', ...stg(4) }}>
            <div style={{ ...lbl, marginBottom: 14 }}>Key metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {metrics.map((mt) => (
                <div key={mt.l} style={{ background: metricBg(mt.c), borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ ...m, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>{mt.l}</div>
                  <div className="tabular" style={{ ...m, fontSize: 20, fontWeight: 600, color: mt.c, letterSpacing: '-0.02em' }}>{mt.v}</div>
                  {mt.bar != null && <div style={{ width: 60, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${Math.min(mt.bar, 100)}%`, background: mt.c, borderRadius: 1, transition: 'width 0.6s ease' }} />
                  </div>}
                  {mt.st && <div style={{ ...m, fontSize: 11, color: mt.c, opacity: 0.6, marginTop: mt.bar != null ? 4 : 3 }}>{mt.st}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '22px 26px 26px', ...stg(5) }}>
            <div style={{ ...lbl, marginBottom: 14 }}>Latest news</div>
            {newsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
              </div>
            ) : news.length > 0 ? news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', padding: '14px 12px', textDecoration: 'none', borderRadius: 12,
                borderBottom: i < news.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.2s var(--ease-out)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: srcDot(n.source), flexShrink: 0 }} />
                  <span style={{ ...m, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 500 }}>{n.source}</span>
                  <span style={{ ...m, fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{relTime(n.published)}</span>
                </div>
                <div style={{ ...s, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
              </a>
            )) : null}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: news.length > 0 ? '12px 0 0' : '24px 0 0' }}>
              {news.length === 0 && <div style={{ ...m, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>News unavailable in preview</div>}
              <a href={`https://finance.yahoo.com/quote/${ticker}.NS/news`} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'var(--purple-d)', border: '0.5px solid var(--purple-b)',
                borderRadius: 20, ...m, fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none',
                transition: 'all 0.2s var(--ease-out)', fontWeight: 500,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(191,90,242,0.18)'; e.currentTarget.style.borderColor = 'rgba(191,90,242,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--purple-d)'; e.currentTarget.style.borderColor = 'var(--purple-b)' }}
              >View on Yahoo Finance {'\u2197'}</a>
            </div>
          </div>
        </>}
      </div>
    </>
  )
}
