import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const DECISION_COLORS = {
  APPROVE: { bg: 'var(--green-d)', color: 'var(--accent-green)', border: 'var(--green-b)' },
  REDUCE: { bg: 'var(--amber-d)', color: 'var(--accent-orange)', border: 'var(--amber-b)' },
  SKIP: { bg: 'var(--red-d)', color: 'var(--accent-red)', border: 'var(--red-b)' },
  STANDBY: { bg: 'var(--purple-d)', color: 'var(--accent-purple)', border: 'var(--purple-b)' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ClaudeInsights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/claude_insights`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const decisions = data?.decisions || []
  const alerts = data?.alerts?.alerts || []
  const advice = data?.strategy_advice

  const realDecisions = decisions.filter(d => d.decision !== 'STANDBY')
  const standbyEntry = decisions.find(d => d.decision === 'STANDBY')
  const isMonitoringOnly = realDecisions.length === 0

  const recentDecisions = realDecisions.slice(-5).reverse()
  const totalReviewed = realDecisions.length
  const approved = realDecisions.filter(d => d.decision === 'APPROVE').length
  const reduced = realDecisions.filter(d => d.decision === 'REDUCE').length
  const vetoed = realDecisions.filter(d => d.decision === 'SKIP').length

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-subtle)',
      borderRadius: 16, overflow: 'hidden', marginTop: 20,
      boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '0.5px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)', position: 'absolute',
          }} />
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)', position: 'absolute',
            animation: 'aiPing 2s ease-out infinite', opacity: 0.6,
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 500,
        }}>Claude Intelligence</span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-muted)',
        }}>v3.0 · active</span>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        ) : !data || (decisions.length === 0 && !advice) ? (
          <div style={{
            padding: '12px 0', textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-tertiary)',
          }}>Monitoring market conditions...</div>
        ) : (
          <>
            {isMonitoringOnly && standbyEntry && (
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 13,
                color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12,
              }}>{standbyEntry.reasoning}</div>
            )}

            {recentDecisions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {recentDecisions.map((d, i) => {
                  const style = DECISION_COLORS[d.decision] || DECISION_COLORS.APPROVE
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                      borderBottom: i < recentDecisions.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                        background: style.bg, color: style.color,
                        border: `0.5px solid ${style.border}`, flexShrink: 0,
                      }}>{d.decision}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.ticker}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: style.color }}>{d.confidence}%</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(d.timestamp)}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{d.reasoning}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Win Rate', value: '42.9%', color: 'var(--accent-green)' },
                { label: 'Profit Factor', value: '1.49', color: 'var(--accent-green)' },
                { label: 'Veto Accuracy', value: '100%', color: 'var(--accent-purple)' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'var(--bg-glass)', borderRadius: 10,
                  padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: 'var(--sans)', fontSize: 20, fontWeight: 600,
                    color: stat.color, lineHeight: 1, letterSpacing: '-0.02em',
                  }}>{stat.value}</div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)',
                    marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500,
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {alerts.length > 0 && alerts.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', fontFamily: 'var(--mono)', fontSize: 12,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                  background: a.alert_level === 'red' ? 'var(--red-d)' : a.alert_level === 'amber' ? 'var(--amber-d)' : 'var(--green-d)',
                  color: a.alert_level === 'red' ? 'var(--accent-red)' : a.alert_level === 'amber' ? 'var(--accent-orange)' : 'var(--accent-green)',
                }}>{a.alert_level === 'red' ? 'XX' : a.alert_level === 'amber' ? '!!' : 'OK'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.ticker}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{a.message}</span>
              </div>
            ))}

            {advice?.top_insight && (
              <div style={{
                marginTop: 8, padding: '12px 14px',
                background: 'var(--bg-glass)', borderRadius: 10,
                borderLeft: '2px solid var(--accent-purple)',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)',
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500,
                }}>Latest Insight</div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 12,
                  color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>{advice.top_insight}</div>
                {advice.focus_for_next_week && (
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 11,
                    color: 'var(--accent-purple)', marginTop: 6, opacity: 0.7,
                  }}>Focus: {advice.focus_for_next_week}</div>
                )}
              </div>
            )}

            {totalReviewed > 0 && (
              <div style={{
                display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 11,
                color: 'var(--text-muted)', paddingTop: 8, marginTop: 8,
                borderTop: '0.5px solid rgba(255,255,255,0.04)',
              }}>
                <span>{totalReviewed} reviewed</span>
                <span style={{ color: 'var(--accent-green)' }}>{approved} approved</span>
                {reduced > 0 && <span style={{ color: 'var(--accent-orange)' }}>{reduced} reduced</span>}
                {vetoed > 0 && <span style={{ color: 'var(--accent-red)' }}>{vetoed} vetoed</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
