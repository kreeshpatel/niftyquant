import React, { useState, useMemo } from 'react'
import { usePortfolioContext } from '../context/PortfolioContext'
import CapitalOverview from '../components/portfolio/CapitalOverview'
import HoldingsTable from '../components/portfolio/HoldingsTable'
import AddTradeModal from '../components/portfolio/AddTradeModal'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'

const SECTOR_COLORS = {
  Banking: '#3b82f6', IT: '#8b5cf6', Energy: '#f59e0b', Metals: '#6b7280',
  Finance: '#06b6d4', Pharma: '#10b981', Auto: '#ef4444', Consumer: '#ec4899',
  FMCG: '#14b8a6', Infrastructure: '#a855f7', Others: '#4b5563',
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 6, padding: '6px 10px', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.name || d.ticker}</div>
      <div style={{ color: 'var(--text-tertiary)' }}>{d.value?.toFixed(1)}%</div>
    </div>
  )
}

export default function Portfolio() {
  const { holdings, totalDeployed, mode, sync, loading, preMoveStats, trades, updateTrade } = usePortfolioContext()
  const [showAddTrade, setShowAddTrade] = useState(false)

  // Sector allocation
  const sectorData = useMemo(() => {
    const sectors = {}
    holdings.forEach(h => {
      const sector = h.sector || 'Others'
      const value = h.last_price * h.quantity
      sectors[sector] = (sectors[sector] || 0) + value
    })
    return Object.entries(sectors).map(([name, value]) => ({
      name, value: totalDeployed > 0 ? (value / totalDeployed * 100) : 0,
      fill: SECTOR_COLORS[name] || '#4b5563',
    })).sort((a, b) => b.value - a.value)
  }, [holdings, totalDeployed])

  // Position sizing
  const positionData = useMemo(() => {
    return holdings.map(h => ({
      ticker: h.tradingsymbol,
      value: totalDeployed > 0 ? (h.last_price * h.quantity / totalDeployed * 100) : 0,
      fill: (h.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)',
    })).sort((a, b) => b.value - a.value)
  }, [holdings, totalDeployed])

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Portfolio</h1>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
            Holdings, capital overview, open positions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={sync} disabled={loading} className="btn">
            {loading ? 'SYNCING...' : 'SYNC'}
          </button>
          <button onClick={() => setShowAddTrade(true)} className="btn btn-primary">+ ADD TRADE</button>
        </div>
      </div>

      {/* Capital overview */}
      <CapitalOverview />

      {/* Holdings table */}
      <div style={{ marginTop: 16 }}>
        <HoldingsTable />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {/* Sector allocation */}
        <div className="widget">
          <div className="widget-header">Sector Allocation</div>
          <div className="widget-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                    {sectorData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {sectorData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.fill, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.value.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Position sizing */}
        <div className="widget">
          <div className="widget-header">Position Sizing</div>
          <div className="widget-body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={positionData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="ticker" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} tickLine={false} axisLine={false} width={30} tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {positionData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 4,
              background: 'var(--bg-elevated)', fontSize: 11, color: 'var(--text-tertiary)',
            }}>
              Risk per trade: 1.5% &middot; Max position: 10%
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Move Paper Trades */}
      {preMoveStats.total > 0 && (
        <div className="widget" style={{ marginTop: 16, borderLeft: '3px solid var(--amber)' }}>
          <div className="widget-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Pre-Move Entries
              <span className="badge badge-amber">{preMoveStats.total} trades</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Paper Trading</span>
          </div>
          <div className="widget-body">
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Open: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{preMoveStats.open}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Closed: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{preMoveStats.closed}</span>
              </div>
              {preMoveStats.closed > 0 && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Win Rate: </span>
                    <span style={{ color: preMoveStats.winRate >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {preMoveStats.winRate}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total P&L: </span>
                    <span style={{ color: preMoveStats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {preMoveStats.totalPnl >= 0 ? '+' : ''}{'\u20B9'}{Math.abs(preMoveStats.totalPnl).toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Performance vs Backtest */}
            {preMoveStats.closed >= 3 && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--r-sm)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
                  PERFORMANCE VS BACKTEST
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Target hit rate (3.39%+ move)</span>
                  <span style={{ fontWeight: 700, color: preMoveStats.targetHitRate >= preMoveStats.backtestExpected ? 'var(--green)' : 'var(--amber)' }}>
                    {preMoveStats.targetHitRate}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Backtest expected</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {preMoveStats.backtestExpected}%
                  </span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3, background: 'var(--bg-terminal)', overflow: 'hidden',
                  position: 'relative', marginTop: 4,
                }}>
                  <div style={{
                    position: 'absolute', height: '100%', width: `${Math.min(100, preMoveStats.targetHitRate)}%`,
                    background: preMoveStats.targetHitRate >= preMoveStats.backtestExpected ? 'var(--green)' : 'var(--amber)',
                    borderRadius: 3,
                  }} />
                  <div style={{
                    position: 'absolute', left: `${Math.min(98, preMoveStats.backtestExpected)}%`,
                    top: -2, bottom: -2, width: 2, background: 'var(--text-secondary)', borderRadius: 1,
                  }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                  {preMoveStats.targetHits}/{preMoveStats.closed} trades hit {preMoveStats.targetPct}%+ target
                  {preMoveStats.targetHitRate >= preMoveStats.backtestExpected
                    ? ' — beating backtest expectation'
                    : ` — below ${preMoveStats.backtestExpected}% expectation (n=${preMoveStats.closed}, needs more data)`}
                </div>
              </div>
            )}

            {/* Open Pre-Move trades */}
            {trades.filter(t => t.source === 'premove' && !t.exit_price).map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 24, borderRadius: 2, background: 'var(--amber)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t.ticker}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                        {t.premove_data?.strength}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Entry: {'\u20B9'}{t.entry_price?.toFixed(1)} x {t.quantity} &middot; {t.entry_date}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.premove_data?.hint && (
                    <span style={{
                      fontSize: 9, fontStyle: 'italic',
                      color: t.premove_data.hint.includes('bullish') ? 'var(--green)' : t.premove_data.hint.includes('bearish') ? 'var(--red)' : 'var(--text-muted)',
                    }}>{t.premove_data.hint}</span>
                  )}
                  <button onClick={() => {
                    const exitPrice = prompt(`Exit price for ${t.ticker}?`)
                    if (exitPrice && !isNaN(parseFloat(exitPrice))) {
                      updateTrade(t.id, {
                        exit_price: parseFloat(exitPrice),
                        exit_date: new Date().toISOString().split('T')[0],
                      })
                    }
                  }} className="btn" style={{ fontSize: 9, padding: '2px 8px' }}>
                    CLOSE
                  </button>
                </div>
              </div>
            ))}

            {/* Closed Pre-Move trades (last 5) */}
            {preMoveStats.closed > 0 && (
              <>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginTop: 10, marginBottom: 6 }}>
                  RECENT CLOSED
                </div>
                {trades.filter(t => t.source === 'premove' && t.exit_price).slice(0, 5).map(t => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                    fontSize: 11, borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.ticker}</span>
                    <span style={{
                      fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: (t.pnl_pct || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {(t.pnl_pct || 0) >= 0 ? '+' : ''}{(t.pnl_pct || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {showAddTrade && <AddTradeModal onClose={() => setShowAddTrade(false)} />}

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
