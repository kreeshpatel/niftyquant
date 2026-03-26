import React, { useState, useEffect, useMemo } from 'react'
import { fetchScreener } from '../api'
import StockPanel from '../components/StockPanel'
import TopLoader from '../components/TopLoader'

const SECTOR_MAP = {
  HDFCBANK:'Banking',ICICIBANK:'Banking',SBIN:'Banking',AXISBANK:'Banking',KOTAKBANK:'Banking',BANKBARODA:'Banking',
  PNB:'Banking',FEDERALBNK:'Banking',IDFCFIRSTB:'Banking',INDUSINDBK:'Banking',AUBANK:'Banking',BANDHANBNK:'Banking',
  TCS:'IT',INFY:'IT',HCLTECH:'IT',WIPRO:'IT',TECHM:'IT',LTIM:'IT',MPHASIS:'IT',PERSISTENT:'IT',COFORGE:'IT',
  RELIANCE:'Energy',ONGC:'Energy',BPCL:'Energy',IOC:'Energy',GAIL:'Energy',NTPC:'Energy',POWERGRID:'Energy',TATAPOWER:'Energy',COALINDIA:'Energy',
  MARUTI:'Auto',TATAMOTORS:'Auto',BAJAJ_AUTO:'Auto',EICHERMOT:'Auto',HEROMOTOCO:'Auto',TVSMOTOR:'Auto',M_M:'Auto',
  HINDUNILVR:'FMCG',ITC:'FMCG',NESTLEIND:'FMCG',BRITANNIA:'FMCG',DABUR:'FMCG',MARICO:'FMCG',TATACONSUM:'FMCG',
  SUNPHARMA:'Pharma',DRREDDY:'Pharma',CIPLA:'Pharma',DIVISLAB:'Pharma',LUPIN:'Pharma',BIOCON:'Pharma',APOLLOHOSP:'Pharma',
  BAJFINANCE:'Finance',BAJAJFINSV:'Finance',CHOLAFIN:'Finance',MUTHOOTFIN:'Finance',HDFCAMC:'Finance',SBILIFE:'Finance',
  TATASTEEL:'Metals',JSWSTEEL:'Metals',HINDALCO:'Metals',VEDL:'Metals',NMDC:'Metals',SAIL:'Metals',
  ULTRACEMCO:'Cement',SHREECEM:'Cement',ACC:'Cement',AMBUJACEM:'Cement',
  BHARTIARTL:'Telecom',INDUSTOWER:'Telecom',
  LT:'Infra',SIEMENS:'Infra',BEL:'Infra',BHEL:'Infra',DLF:'Infra',GODREJPROP:'Infra',
  TITAN:'Consumer',TRENT:'Consumer',DMART:'Consumer',JUBLFOOD:'Consumer',INDIGO:'Consumer',INDHOTEL:'Consumer',HAVELLS:'Consumer',DIXON:'Consumer',
  PIDILITIND:'Chemicals',SRF:'Chemicals',PIIND:'Chemicals',
}

function getTileColor(ret) {
  if (ret > 3) return 'rgba(52,211,153,1)'
  if (ret > 1) return 'rgba(52,211,153,0.6)'
  if (ret > 0) return 'rgba(52,211,153,0.3)'
  if (ret > -1) return 'rgba(248,113,113,0.3)'
  if (ret > -3) return 'rgba(248,113,113,0.6)'
  return 'rgba(248,113,113,1)'
}

function getTileBg(ret) {
  if (ret > 3) return 'rgba(52,211,153,0.20)'
  if (ret > 1) return 'rgba(52,211,153,0.12)'
  if (ret > 0) return 'rgba(52,211,153,0.06)'
  if (ret > -1) return 'rgba(248,113,113,0.06)'
  if (ret > -3) return 'rgba(248,113,113,0.12)'
  return 'rgba(248,113,113,0.20)'
}

const PERIODS = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '1m', label: '1M' },
]

export default function Heatmap() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('1d')
  const [showSignals, setShowSignals] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [hoveredTicker, setHoveredTicker] = useState(null)

  useEffect(() => {
    fetchScreener().then(data => {
      setStocks(data)
      setLoading(false)
    })
  }, [])

  const sectors = useMemo(() => {
    const map = {}
    stocks.forEach(s => {
      const sector = SECTOR_MAP[s.ticker] || s.sector || 'Others'
      if (!map[sector]) map[sector] = []
      map[sector].push(s)
    })
    // Sort sectors by number of stocks descending
    return Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, list]) => ({
        name,
        stocks: list.sort((a, b) => Math.abs(getReturn(b, period)) - Math.abs(getReturn(a, period))),
      }))
  }, [stocks, period])

  const totalStocks = stocks.length

  return (
    <div>
      <TopLoader loading={loading} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 700, margin: 0,
          }}>Market Heatmap</h1>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>{totalStocks} stocks across {sectors.length} sectors</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Signals toggle */}
          <button
            onClick={() => setShowSignals(!showSignals)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, padding: '5px 12px',
              borderRadius: 6,
              background: showSignals ? 'var(--purple-d)' : 'var(--bg-hover)',
              border: `1px solid ${showSignals ? 'var(--purple-b)' : 'var(--border)'}`,
              color: showSignals ? 'var(--purple)' : 'var(--text-dim)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >Signals {showSignals ? 'ON' : 'OFF'}</button>

          {/* Period toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-hover)', borderRadius: 6,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                padding: '5px 14px', border: 'none', cursor: 'pointer',
                background: period === p.key ? 'var(--purple-d)' : 'transparent',
                color: period === p.key ? 'var(--purple)' : 'var(--text-dim)',
                transition: 'all 0.2s',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16,
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)',
      }}>
        <span>-5%</span>
        {[
          'rgba(248,113,113,1)', 'rgba(248,113,113,0.6)', 'rgba(248,113,113,0.3)',
          'rgba(255,255,255,0.08)',
          'rgba(52,211,153,0.3)', 'rgba(52,211,153,0.6)', 'rgba(52,211,153,1)',
        ].map((c, i) => (
          <div key={i} style={{ width: 24, height: 8, background: c, borderRadius: 2 }} />
        ))}
        <span>+5%</span>
      </div>

      {/* Heatmap grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sectors.map(sector => (
            <div key={sector.name}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
                letterSpacing: 1.5, marginBottom: 8,
              }}>{sector.name} ({sector.stocks.length})</div>

              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 3,
              }}>
                {sector.stocks.map(s => {
                  const ret = getReturn(s, period)
                  const isBuy = s.signal === 'BUY'
                  const isHovered = hoveredTicker === s.ticker
                  return (
                    <div
                      key={s.ticker}
                      onClick={() => setSelectedTicker(s.ticker)}
                      onMouseEnter={() => setHoveredTicker(s.ticker)}
                      onMouseLeave={() => setHoveredTicker(null)}
                      style={{
                        minWidth: 60, minHeight: 40,
                        padding: '6px 8px',
                        background: getTileBg(ret),
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 2,
                        border: showSignals && isBuy
                          ? '2px solid rgba(255,255,255,0.8)'
                          : '1px solid rgba(255,255,255,0.04)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
                        animation: showSignals && isBuy ? 'pulse 2s infinite' : 'none',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                        color: getTileColor(ret),
                        lineHeight: 1,
                      }}>{s.ticker}</span>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 10,
                        color: getTileColor(ret),
                        opacity: 0.8,
                      }}>
                        {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock panel */}
      {selectedTicker && (
        <StockPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}
    </div>
  )
}

function getReturn(stock, period) {
  if (period === '5d') return stock.return_5d || (stock.return_1d || 0) * 2.5
  if (period === '1m') return stock.momentum_score ? stock.momentum_score * 10 : (stock.return_1d || 0) * 10
  return stock.return_1d || 0
}
