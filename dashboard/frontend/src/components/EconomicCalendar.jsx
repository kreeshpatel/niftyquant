import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const TYPE_COLORS = {
  RBI: '#60a5fa',
  EXPIRY: '#fbbf24',
  RESULTS: '#818cf8',
  BUDGET: '#f87171',
}

const IMPACT_STYLES = {
  HIGH: { bg: 'var(--red-d)', color: 'var(--red)', border: 'var(--red-b)', label: 'HIGH' },
  MEDIUM: { bg: 'var(--amber-d)', color: 'var(--amber)', border: 'var(--amber-b)', label: 'MED' },
  LOW: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)', border: 'var(--border)', label: 'LOW' },
}

function getLocalEvents() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  function lastThursday(year, month) {
    const d = new Date(year, month + 1, 0)
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  const events = [
    { date: '2026-04-07', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-06-05', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-08-07', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-10-02', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-12-04', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    ...[-1, 0, 1, 2, 3].map(offset => {
      const m = (currentMonth + offset + 12) % 12
      const y = currentYear + Math.floor((currentMonth + offset) / 12)
      return { date: lastThursday(y, m), type: 'EXPIRY', title: 'F&O Monthly Expiry', impact: 'MEDIUM' }
    }),
    { date: '2026-04-01', type: 'RESULTS', title: 'Q4 Results Season Begins', impact: 'HIGH' },
    { date: '2026-07-01', type: 'RESULTS', title: 'Q1 FY27 Results Begin', impact: 'MEDIUM' },
    { date: '2026-10-01', type: 'RESULTS', title: 'Q2 FY27 Results Begin', impact: 'MEDIUM' },
    { date: '2027-02-01', type: 'BUDGET', title: 'Union Budget 2027', impact: 'HIGH' },
  ]

  return events
    .filter(e => new Date(e.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6)
}

function daysUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    // Try API first, fall back to local computation
    fetch(`${API_BASE}/api/calendar`)
      .then(r => r.json())
      .then(data => {
        if (data.events && data.events.length > 0) {
          setEvents(data.events)
        } else {
          setEvents(getLocalEvents())
        }
      })
      .catch(() => setEvents(getLocalEvents()))
  }, [])

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '20px 0 8px', fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5,
      }}>
        <span>Upcoming events</span>
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        {events.length === 0 ? (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)',
          }}>No upcoming events</div>
        ) : events.map((event, i) => {
          const days = daysUntil(event.date)
          const isNear = days <= 1
          const impact = IMPACT_STYLES[event.impact] || IMPACT_STYLES.LOW
          const dotColor = TYPE_COLORS[event.type] || 'var(--text-dim)'

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
              background: isNear ? 'rgba(52,211,153,0.04)' : 'transparent',
            }}>
              {/* Type dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dotColor, flexShrink: 0,
                boxShadow: isNear ? `0 0 8px ${dotColor}` : 'none',
              }} />

              {/* Date */}
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: isNear ? 'var(--green)' : 'var(--text-dim)',
                minWidth: 52,
                fontWeight: isNear ? 600 : 400,
              }}>{formatDate(event.date)}</span>

              {/* Title */}
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--text)',
                flex: 1,
              }}>{event.title}</span>

              {/* Impact badge */}
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 10,
                background: impact.bg,
                color: impact.color,
                border: `1px solid ${impact.border}`,
                letterSpacing: 0.5,
              }}>{impact.label}</span>

              {/* Days until */}
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: isNear ? 'var(--green)' : 'var(--text-dim)',
                minWidth: 52,
                textAlign: 'right',
                fontWeight: isNear ? 600 : 400,
              }}>
                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days}d`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
