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
  const { holdings, totalDeployed, mode, sync, loading } = usePortfolioContext()
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
