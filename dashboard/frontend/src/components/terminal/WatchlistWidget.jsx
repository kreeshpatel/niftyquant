import React, { useState, useMemo } from 'react'
import { fetchScreener } from '../../api'
import stockData from '../../data/stockData.json'
import { getSector } from '../../data/sectorMap'

const WATCHLIST_KEY = 'nq_watchlist'
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BAJFINANCE', 'TATASTEEL', 'SBIN'] }
  catch { return ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'] }
}

export default function WatchlistWidget() {
  const [tickers] = useState(getWatchlist)

  const data = useMemo(() => {
    return tickers.map(ticker => {
      const d = stockData[ticker]
      if (!d) return null
      return {
        ticker,
        sector: getSector(ticker),
        price: d.close,
        change: d.dayChange,
        rsi: d.rsi,
        volume: d.volumeRatio,
        signal: d.hybridSignal === 1 ? 'BUY' : d.inMomentum === 1 ? 'WATCH' : null,
      }
    }).filter(Boolean)
  }, [tickers])

  return (
    <div className="widget">
      <div className="widget-header">
        <span>Watchlist</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{data.length} stocks</span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 320 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Chg%</th>
              <th style={{ textAlign: 'right' }}>RSI</th>
              <th style={{ textAlign: 'center' }}>Signal</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.ticker}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.ticker}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.price?.toFixed(1)}</td>
                <td style={{
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: (d.change || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                  fontWeight: 600,
                }}>
                  {(d.change || 0) >= 0 ? '+' : ''}{(d.change || 0).toFixed(2)}%
                </td>
                <td style={{
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: d.rsi > 70 ? 'var(--red)' : d.rsi < 30 ? 'var(--green)' : 'var(--text-secondary)',
                }}>{d.rsi?.toFixed(0)}</td>
                <td style={{ textAlign: 'center' }}>
                  {d.signal && (
                    <span className={d.signal === 'BUY' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: 9 }}>
                      {d.signal}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
