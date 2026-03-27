import React from 'react'
import { usePortfolioContext } from '../../context/PortfolioContext'
import { formatINR, formatLakh } from '../../utils/pnlCalculations'

export default function CapitalOverview() {
  const { totalCapital, totalDeployed, totalCash, todayPnl, utilization, holdings, settings } = usePortfolioContext()

  // Open risk = sum of unrealized loss potential (simplified)
  const openRisk = holdings.reduce((sum, h) => {
    const risk = h.pnl < 0 ? Math.abs(h.pnl) : 0
    return sum + risk
  }, 0)
  const riskPct = totalCapital > 0 ? (openRisk / totalCapital * 100) : 0

  const cards = [
    {
      label: 'Total Capital',
      value: formatLakh(totalCapital),
      sub: `${((totalCapital / settings.initialCapital - 1) * 100).toFixed(1)}% all-time`,
      color: 'var(--text-primary)',
    },
    {
      label: 'Deployed',
      value: formatLakh(totalDeployed),
      sub: `${utilization.toFixed(0)}% utilized`,
      color: 'var(--blue)',
    },
    {
      label: 'Cash',
      value: formatLakh(totalCash),
      sub: `${(100 - utilization).toFixed(0)}% available`,
      color: 'var(--text-secondary)',
    },
    {
      label: "Today's P&L",
      value: formatINR(todayPnl),
      sub: totalCapital > 0 ? `${(todayPnl / totalCapital * 100).toFixed(2)}%` : '--',
      color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'Open Risk',
      value: formatINR(-openRisk),
      sub: `${riskPct.toFixed(1)}% of capital`,
      color: riskPct > 5 ? 'var(--red)' : 'var(--amber)',
      warn: riskPct > 5,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {cards.map(c => (
        <div key={c.label} className="metric-card" style={{
          borderColor: c.warn ? 'var(--red-b)' : undefined,
        }}>
          <div className="label">{c.label}</div>
          <div className="value" style={{ color: c.color, fontSize: 20 }}>{c.value}</div>
          <div className="sub">{c.sub}</div>
          {c.warn && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>Max 5% allowed</div>}
        </div>
      ))}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: repeat(5"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
