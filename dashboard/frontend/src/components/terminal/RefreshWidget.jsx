import React, { useState } from 'react'
import lastRefresh from '../../data/lastRefresh.json'

export default function RefreshWidget() {
  const [copied, setCopied] = useState(false)

  const age = lastRefresh.timestamp
    ? Math.round((Date.now() - new Date(lastRefresh.timestamp).getTime()) / 3600000)
    : null
  const isStale = age !== null && age > 24
  const cmd = 'cd dashboard/frontend && node src/scripts/dailyRefresh.cjs'

  const copy = () => {
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isStale ? 'var(--amber)' : 'var(--green)',
            animation: isStale ? 'pulse 2s infinite' : 'none',
          }} />
          Data Refresh
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
          {lastRefresh.success ? 'OK' : 'PARTIAL'}
        </span>
      </div>
      <div className="widget-body" style={{ fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Last refresh</span>
          <span style={{ color: isStale ? 'var(--amber)' : 'var(--text-secondary)', fontWeight: 600 }}>
            {lastRefresh.date || 'never'}
            {age !== null && <span style={{ fontWeight: 400, marginLeft: 4 }}>({age}h ago)</span>}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Duration</span>
          <span style={{ color: 'var(--text-secondary)' }}>{lastRefresh.elapsed || 0}s</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {Object.entries(lastRefresh.steps || {}).map(([step, ok]) => (
            <span key={step} style={{
              flex: 1, textAlign: 'center', padding: '3px 0', borderRadius: 3, fontSize: 9, fontWeight: 600,
              background: ok ? 'var(--green-d)' : 'var(--red-d)',
              color: ok ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${ok ? 'var(--green-b)' : 'var(--red-b)'}`,
            }}>{step}</span>
          ))}
        </div>

        {/* Refresh command */}
        <div style={{
          padding: '6px 8px', borderRadius: 4, background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)', fontSize: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <code style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            node src/scripts/dailyRefresh.cjs
          </code>
          <button onClick={copy} style={{
            background: copied ? 'var(--green-d)' : 'transparent', border: 'none',
            color: copied ? 'var(--green)' : 'var(--text-muted)', cursor: 'pointer',
            fontSize: 9, fontWeight: 600, fontFamily: 'var(--mono)', padding: '2px 6px',
            borderRadius: 3, flexShrink: 0, marginLeft: 8,
          }}>{copied ? 'COPIED' : 'COPY'}</button>
        </div>

        {isStale && (
          <div style={{
            marginTop: 6, padding: '4px 8px', borderRadius: 3,
            background: 'var(--amber-d)', border: '1px solid var(--amber-b)',
            fontSize: 10, color: 'var(--amber)',
          }}>
            Data is {age}h old. Run refresh from terminal.
          </div>
        )}
      </div>
    </div>
  )
}
