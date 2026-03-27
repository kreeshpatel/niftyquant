import React, { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const TYPE_COLORS = {
  RBI: '#0A84FF',
  EXPIRY: '#FF9F0A',
  RESULTS: '#BF5AF2',
  BUDGET: '#FF453A',
}

const IMPACT_STYLES = {
  HIGH: { bg: 'var(--red-d)', color: 'var(--accent-red)', border: 'var(--red-b)', label: 'HIGH' },
  MEDIUM: { bg: 'var(--amber-d)', color: 'var(--accent-orange)', border: 'var(--amber-b)', label: 'MED' },
  LOW: { bg: 'var(--bg-glass)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)', label: 'LOW' },
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
        margin: '20px 0 8px', fontFamily: 'var(--mono)', fontSize: 12,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500,
      }}>
        <span>Upcoming events</span>
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        {events.length === 0 ? (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-tertiary)',
          }}>No upcoming events</div>
        ) : events.map((event, i) => {
          const days = daysUntil(event.date)
          const isNear = days <= 1
          const impact = IMPACT_STYLES[event.impact] || IMPACT_STYLES.LOW
          const dotColor = TYPE_COLORS[event.type] || 'var(--text-tertiary)'

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderBottom: i < events.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
              background: isNear ? 'rgba(0,200,150,0.04)' : 'transparent',
              transition: 'background 0.2s var(--ease-out)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dotColor, flexShrink: 0,
                boxShadow: isNear ? `0 0 8px ${dotColor}` : 'none',
              }} />
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: isNear ? 'var(--accent-green)' : 'var(--text-tertiary)',
                minWidth: 52,
                fontWeight: isNear ? 600 : 400,
                fontFeatureSettings: '"tnum" 1',
              }}>{formatDate(event.date)}</span>
              <span style={{
                fontFamily: 'var(--sans)',
                fontSize: 13,
                color: 'var(--text-primary)',
                flex: 1,
              }}>{event.title}</span>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 10,
                background: impact.bg,
                color: impact.color,
                border: `0.5px solid ${impact.border}`,
                letterSpacing: '0.05em',
              }}>{impact.label}</span>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: isNear ? 'var(--accent-green)' : 'var(--text-tertiary)',
                minWidth: 52,
                textAlign: 'right',
                fontWeight: isNear ? 600 : 400,
                fontFeatureSettings: '"tnum" 1',
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
