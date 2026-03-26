import React, { useState, useEffect, useMemo } from 'react'
import { fetchScreener } from '../api'
import { SECTOR_MAP, SECTOR_ORDER, getSector } from '../data/sectorMap'
import StockPanel from '../components/StockPanel'
import TopLoader from '../components/TopLoader'

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

function getReturn(stock, period) {
  if (period === '5d') return stock.return_5d || (stock.return_1d || 0) * 2.5
  if (period === '1m') return stock.momentum_score ? stock.momentum_score * 10 : (stock.return_1d || 0) * 10
  return stock.return_1d || 0
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
  const [showOthers, setShowOthers] = useState(false)

  useEffect(() => {
    fetchScreener().then(data => {
      setStocks(data)
      setLoading(false)
    })
  }, [])

  const sectors = useMemo(() => {
    const map = {}
    stocks.forEach(s => {
      const sector = getSector(s.ticker)
      if (!map[sector]) map[sector] = []
      map[sector].push(s)
    })

    // Sort by SECTOR_ORDER
    const ordered = SECTOR_ORDER
      .filter(name => map[name] && map[name].length > 0)
      .map(name => {
        const list = map[name].sort((a, b) =>
          Math.abs(getReturn(b, period)) - Math.abs(getReturn(a, period))
        )
        const returns = list.map(s => getReturn(s, period))
        const avgReturn = returns.length > 0
          ? returns.reduce((a, b) => a + b, 0) / returns.length
          : 0
        return { name, stocks: list, avgReturn }
      })

    // Add any sectors not in SECTOR_ORDER (shouldn't happen, but safety)
    Object.keys(map).forEach(name => {
      if (!SECTOR_ORDER.includes(name)) {
        const list = map[name].sort((a, b) =>
          Math.abs(getReturn(b, period)) - Math.abs(getReturn(a, period))
        )
        const returns = list.map(s => getReturn(s, period))
        const avgReturn = returns.length > 0
          ? returns.reduce((a, b) => a + b, 0) / returns.length
          : 0
        ordered.push({ name, stocks: list, avgReturn })
      }
    })

    return ordered
  }, [stocks, period])

  const namedSectors = sectors.filter(s => s.name !== 'Others')
  const othersSector = sectors.find(s => s.name === 'Others')
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
          }}>{totalStocks} stocks across {namedSectors.length} sectors</span>
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
          {namedSectors.map(sector => (
            <SectorGroup
              key={sector.name}
              sector={sector}
              period={period}
              showSignals={showSignals}
              hoveredTicker={hoveredTicker}
              onHover={setHoveredTicker}
              onSelect={setSelectedTicker}
            />
          ))}

          {/* Others section — collapsed by default */}
          {othersSector && othersSector.stocks.length > 0 && (
            <div>
              <button
                onClick={() => setShowOthers(!showOthers)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  letterSpacing: 1.5, marginBottom: 8, padding: 0,
                }}
              >
                <span style={{
                  transform: showOthers ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s', display: 'inline-block',
                }}>{'\u25B6'}</span>
                Unclassified ({othersSector.stocks.length})
                <span style={{
                  color: othersSector.avgReturn >= 0 ? 'var(--green)' : 'var(--red)',
                  fontWeight: 500,
                }}>
                  {othersSector.avgReturn >= 0 ? '+' : ''}{othersSector.avgReturn.toFixed(2)}%
                </span>
              </button>

              {showOthers && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {othersSector.stocks.map(s => (
                    <StockTile
                      key={s.ticker}
                      stock={s}
                      period={period}
                      showSignals={showSignals}
                      isHovered={hoveredTicker === s.ticker}
                      onHover={setHoveredTicker}
                      onSelect={setSelectedTicker}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stock panel */}
      {selectedTicker && (
        <StockPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}
    </div>
  )
}

function SectorGroup({ sector, period, showSignals, hoveredTicker, onHover, onSelect }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 8,
      }}>
        <span>{sector.name}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>({sector.stocks.length})</span>
        <span style={{
          color: sector.avgReturn >= 0 ? 'var(--green)' : 'var(--red)',
          fontWeight: 500,
        }}>
          {sector.avgReturn >= 0 ? '+' : ''}{sector.avgReturn.toFixed(2)}%
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {sector.stocks.map(s => (
          <StockTile
            key={s.ticker}
            stock={s}
            period={period}
            showSignals={showSignals}
            isHovered={hoveredTicker === s.ticker}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function StockTile({ stock, period, showSignals, isHovered, onHover, onSelect }) {
  const ret = getReturn(stock, period)
  const isBuy = stock.signal === 'BUY'

  return (
    <div
      onClick={() => onSelect(stock.ticker)}
      onMouseEnter={() => onHover(stock.ticker)}
      onMouseLeave={() => onHover(null)}
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
        color: getTileColor(ret), lineHeight: 1,
      }}>{stock.ticker}</span>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: getTileColor(ret), opacity: 0.8,
      }}>
        {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
      </span>
    </div>
  )
}
