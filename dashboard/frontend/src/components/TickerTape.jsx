import React, { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function TickerSkeleton() {
  return (
    <div style={{
      height: 32,
      background: 'rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
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
      // Use fallback data on error
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
      background: 'rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
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
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 32,
            flexShrink: 0,
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px',
            }}>{s.ticker}</span>
            <span style={{
              color: '#e8e8f0',
              fontWeight: 500,
            }}>{'\u20B9'}{Number(s.price).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span style={{
              color: s.change_pct >= 0 ? '#34d399' : '#f87171',
              fontSize: 10,
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
