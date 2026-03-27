import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function TickerSkeleton() {
  return (
    <div style={{
      height: 32,
      background: 'var(--bg-card)',
      borderBottom: '0.5px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 32,
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
      ))}
    </div>
  )
}

export default function TickerTape() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTicker = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ticker`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setStocks(data)
      }
    } catch {
      const fallback = [
        'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK',
        'HINDUNILVR','SBIN','BHARTIARTL','BAJFINANCE',
        'KOTAKBANK','TITAN','AXISBANK','MARUTI',
        'SUNPHARMA','WIPRO'
      ].map(t => ({
        ticker: t,
        price: 1000 + Math.random() * 3000,
        change_pct: (Math.random() - 0.5) * 4,
        change_abs: (Math.random() - 0.5) * 50,
      }))
      setStocks(fallback)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicker()
    const interval = setInterval(fetchTicker, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <TickerSkeleton />
  if (stocks.length === 0) return null

  return (
    <div className="ticker-wrap" style={{
      height: 32,
      overflow: 'hidden',
      background: 'var(--bg-card)',
      borderBottom: '0.5px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        animation: 'ticker 40s linear infinite',
        whiteSpace: 'nowrap',
        gap: 0,
      }}>
        {[...stocks, ...stocks].map((s, i) => (
          <span key={i} style={{
            padding: '0 24px',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            borderRight: '0.5px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 32,
            flexShrink: 0,
          }}>
            <span style={{
              color: 'var(--text-secondary)',
              letterSpacing: '0.3px',
            }}>{s.ticker}</span>
            <span style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontFeatureSettings: '"tnum" 1',
            }}>{'\u20B9'}{Number(s.price).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span style={{
              color: s.change_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              fontSize: 11,
              fontFeatureSettings: '"tnum" 1',
            }}>
              {s.change_pct >= 0 ? '\u25B2' : '\u25BC'}
              {Math.abs(s.change_pct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
