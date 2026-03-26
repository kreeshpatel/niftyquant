import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const DECISION_COLORS = {
  APPROVE: { bg: 'var(--green-d)', color: 'var(--green)', border: 'var(--green-b)' },
  REDUCE: { bg: 'var(--amber-d)', color: 'var(--amber)', border: 'var(--amber-b)' },
  SKIP: { bg: 'var(--red-d)', color: 'var(--red)', border: 'var(--red-b)' },
  STANDBY: { bg: 'var(--purple-d)', color: 'var(--purple)', border: 'var(--purple-b)' },
}

const ALERT_COLORS = {
  green: { bg: 'rgba(52,211,153,0.06)', color: 'var(--green)', icon: 'OK' },
  amber: { bg: 'rgba(251,191,36,0.06)', color: 'var(--amber)', icon: '!!' },
  red: { bg: 'rgba(248,113,113,0.06)', color: 'var(--red)', icon: 'XX' },
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

  // Separate real decisions from standby status
  const realDecisions = decisions.filter(d => d.decision !== 'STANDBY')
  const standbyEntry = decisions.find(d => d.decision === 'STANDBY')
  const isMonitoringOnly = realDecisions.length === 0 && !!standbyEntry

  const recentDecisions = realDecisions.slice(-5).reverse()

  // Veto stats (only count real decisions)
  const totalReviewed = realDecisions.length
  const vetoed = realDecisions.filter(d => d.decision === 'SKIP').length
  const approved = realDecisions.filter(d => d.decision === 'APPROVE').length
  const reduced = realDecisions.filter(d => d.decision === 'REDUCE').length

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '20px 0 8px', fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#818cf8', boxShadow: '0 0 8px #818cf8',
            animation: 'pulse 2s infinite',
          }} />
          Claude Intelligence
        </span>
      </div>

      <div className="glass" style={{ padding: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        ) : !data || (decisions.length === 0 && alerts.length === 0 && !advice) ? (
          <div style={{
            padding: '16px 0', textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)',
          }}>
            No Claude decisions yet. Run daily_runner.py to generate insights.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Monitoring / standby state */}
            {isMonitoringOnly && standbyEntry && (
              <div style={{
                background: 'rgba(129,140,248,0.05)',
                border: '1px solid rgba(129,140,248,0.15)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#818cf8', boxShadow: '0 0 8px #818cf8',
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                    color: 'var(--purple)', textTransform: 'uppercase', fontWeight: 600,
                  }}>Active Monitoring</span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.15)',
                    marginLeft: 'auto',
                  }}>{timeAgo(standbyEntry.timestamp)}</span>
                </div>
                <p style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0,
                }}>{standbyEntry.reasoning}</p>
                {standbyEntry.watch_for && (
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--purple)', marginTop: 8, opacity: 0.7,
                  }}>Watching: {standbyEntry.watch_for}</div>
                )}
                {(standbyEntry.key_positives?.length > 0 || standbyEntry.key_concerns?.length > 0) && (
                  <div style={{
                    display: 'flex', gap: 16, marginTop: 10,
                    fontFamily: 'var(--mono)', fontSize: 10,
                  }}>
                    {standbyEntry.key_positives?.length > 0 && (
                      <div style={{ flex: 1 }}>
                        {standbyEntry.key_positives.map((p, i) => (
                          <div key={i} style={{ color: 'rgba(52,211,153,0.6)', lineHeight: 1.6 }}>+ {p}</div>
                        ))}
                      </div>
                    )}
                    {standbyEntry.key_concerns?.length > 0 && (
                      <div style={{ flex: 1 }}>
                        {standbyEntry.key_concerns.map((c, i) => (
                          <div key={i} style={{ color: 'rgba(248,113,113,0.5)', lineHeight: 1.6 }}>- {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Real signal decisions */}
            {recentDecisions.length > 0 && (
              <div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                  color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8,
                }}>Signal Decisions</div>
                {recentDecisions.map((d, i) => {
                  const style = DECISION_COLORS[d.decision] || DECISION_COLORS.APPROVE
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 0',
                      borderBottom: i < recentDecisions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 4,
                        background: style.bg, color: style.color,
                        border: `1px solid ${style.border}`,
                        flexShrink: 0,
                      }}>{d.decision}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                            color: 'var(--text)',
                          }}>{d.ticker}</span>
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, color: style.color,
                          }}>{d.confidence}%</span>
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.15)',
                            marginLeft: 'auto',
                          }}>{timeAgo(d.timestamp)}</span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--mono)', fontSize: 11,
                          color: 'rgba(255,255,255,0.4)', marginTop: 2,
                          lineHeight: 1.5,
                        }}>{d.reasoning}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Position alerts */}
            {alerts.length > 0 && (
              <div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                  color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 6,
                }}>Position Alerts</div>
                {alerts.map((a, i) => {
                  const style = ALERT_COLORS[a.alert_level] || ALERT_COLORS.green
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', fontFamily: 'var(--mono)', fontSize: 11,
                    }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px',
                        borderRadius: 3, background: style.bg, color: style.color,
                      }}>{style.icon}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.ticker}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{a.message}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Strategy insight */}
            {advice && (
              <div style={{
                background: 'rgba(129,140,248,0.04)',
                borderLeft: '2px solid rgba(129,140,248,0.3)',
                borderRadius: '0 8px 8px 0',
                padding: '10px 12px',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                  color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 4,
                }}>Strategy Insight</div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
                }}>{advice.top_insight || advice.overall_assessment}</div>
                {advice.focus_for_next_week && (
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--purple)', marginTop: 6,
                  }}>Focus: {advice.focus_for_next_week}</div>
                )}
              </div>
            )}

            {/* Veto accuracy tracker */}
            {totalReviewed > 0 && (
              <div style={{
                display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 10,
                color: 'rgba(255,255,255,0.3)', paddingTop: 6,
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span>{totalReviewed} reviewed</span>
                <span style={{ color: 'var(--green)' }}>{approved} approved</span>
                {reduced > 0 && <span style={{ color: 'var(--amber)' }}>{reduced} reduced</span>}
                {vetoed > 0 && <span style={{ color: 'var(--red)' }}>{vetoed} vetoed</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
