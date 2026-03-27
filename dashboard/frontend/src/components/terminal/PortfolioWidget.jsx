import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolioContext } from '../../context/PortfolioContext'
import { formatINR, formatLakh } from '../../utils/pnlCalculations'

export default function PortfolioWidget() {
  const { holdings, totalCapital, totalDeployed, totalCash, todayPnl, utilization } = usePortfolioContext()
  const navigate = useNavigate()

  return (
    <div className="widget">
      <div className="widget-header">
        <span>Portfolio</span>
        <button onClick={() => navigate('/portfolio')} style={{
          background: 'none', border: 'none', color: 'var(--blue)',
          fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          fontFamily: 'var(--mono)',
        }}>DETAILS &rarr;</button>
      </div>
      <div className="widget-body">
        {/* Capital cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatLakh(totalCapital)}</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>TODAY P&L</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatINR(todayPnl)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>DEPLOYED</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{formatLakh(totalDeployed)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{utilization.toFixed(0)}% utilized</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>CASH</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{formatLakh(totalCash)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(100 - utilization).toFixed(0)}% available</div>
          </div>
        </div>

        {/* Holdings list */}
        {holdings.slice(0, 4).map(h => (
          <div key={h.tradingsymbol} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{h.tradingsymbol}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.quantity} shares</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: h.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(h.pnl)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {h.day_change_percentage >= 0 ? '+' : ''}{h.day_change_percentage.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
        {holdings.length > 4 && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)' }}>
            +{holdings.length - 4} more positions
          </div>
        )}
      </div>
    </div>
  )
}
