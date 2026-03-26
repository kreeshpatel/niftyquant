import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const DECISION_COLORS = {
  APPROVE: { bg: 'var(--green-d)', color: 'var(--green)', border: 'var(--green-b)' },
  REDUCE: { bg: 'var(--amber-d)', color: 'var(--amber)', border: 'var(--amber-b)' },
  SKIP: { bg: 'var(--red-d)', color: 'var(--red)', border: 'var(--red-b)' },
  STANDBY: { bg: 'var(--purple-d)', color: 'var(--purple)', border: 'var(--purple-b)' },
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
      background: 'linear-gradient(135deg, rgba(129,140,248,0.06) 0%, rgba(99,102,241,0.03) 100%)',
      border: '1px solid rgba(129,140,248,0.15)',
      borderRadius: 16, overflow: 'hidden', marginTop: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(129,140,248,0.1)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#818cf8', position: 'absolute',
          }} />
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#818cf8', position: 'absolute',
            animation: 'aiPing 2s ease-out infinite', opacity: 0.6,
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
          textTransform: 'uppercase', color: 'rgba(129,140,248,0.7)',
        }}>Claude Intelligence</span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9,
          color: 'rgba(255,255,255,0.2)',
        }}>v3.0 · active</span>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 18px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        ) : !data || (decisions.length === 0 && !advice) ? (
          <div style={{
            padding: '12px 0', textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)',
          }}>Monitoring market conditions...</div>
        ) : (
          <>
            {/* Monitoring / standby message */}
            {isMonitoringOnly && standbyEntry && (
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 12,
              }}>{standbyEntry.reasoning}</div>
            )}

            {/* Real signal decisions */}
            {recentDecisions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {recentDecisions.map((d, i) => {
                  const style = DECISION_COLORS[d.decision] || DECISION_COLORS.APPROVE
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                      borderBottom: i < recentDecisions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 4,
                        background: style.bg, color: style.color,
                        border: `1px solid ${style.border}`, flexShrink: 0,
                      }}>{d.decision}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{d.ticker}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: style.color }}>{d.confidence}%</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>{timeAgo(d.timestamp)}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.5 }}>{d.reasoning}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Win Rate', value: '42.9%', color: 'var(--green)' },
                { label: 'Profit Factor', value: '1.49', color: 'var(--green)' },
                { label: 'Veto Accuracy', value: '100%', color: 'var(--purple)' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                  padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500,
                    color: stat.color, lineHeight: 1,
                  }}>{stat.value}</div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(255,255,255,0.2)',
                    marginTop: 4, letterSpacing: 1, textTransform: 'uppercase',
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Position alerts */}
            {alerts.length > 0 && alerts.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', fontFamily: 'var(--mono)', fontSize: 11,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                  background: a.alert_level === 'red' ? 'var(--red-d)' : a.alert_level === 'amber' ? 'var(--amber-d)' : 'var(--green-d)',
                  color: a.alert_level === 'red' ? 'var(--red)' : a.alert_level === 'amber' ? 'var(--amber)' : 'var(--green)',
                }}>{a.alert_level === 'red' ? 'XX' : a.alert_level === 'amber' ? '!!' : 'OK'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.ticker}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{a.message}</span>
              </div>
            ))}

            {/* Strategy insight */}
            {advice?.top_insight && (
              <div style={{
                marginTop: 8, padding: '10px 12px',
                background: 'rgba(129,140,248,0.06)', borderRadius: 8,
                borderLeft: '2px solid rgba(129,140,248,0.4)',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(129,140,248,0.5)',
                  letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
                }}>Latest Insight</div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
                }}>{advice.top_insight}</div>
                {advice.focus_for_next_week && (
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--purple)', marginTop: 6, opacity: 0.7,
                  }}>Focus: {advice.focus_for_next_week}</div>
                )}
              </div>
            )}

            {/* Live decision tracker */}
            {totalReviewed > 0 && (
              <div style={{
                display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 10,
                color: 'rgba(255,255,255,0.3)', paddingTop: 8, marginTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span>{totalReviewed} reviewed</span>
                <span style={{ color: 'var(--green)' }}>{approved} approved</span>
                {reduced > 0 && <span style={{ color: 'var(--amber)' }}>{reduced} reduced</span>}
                {vetoed > 0 && <span style={{ color: 'var(--red)' }}>{vetoed} vetoed</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
