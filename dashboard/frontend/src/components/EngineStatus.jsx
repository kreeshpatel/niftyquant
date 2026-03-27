import React from 'react'

const rows = [
  { key: 'Active Model', val: 'base_v2', color: 'var(--accent-purple)' },
  { key: 'Model AUC', val: '0.595', color: 'var(--accent-green)' },
  { key: 'ADX Threshold', val: '> 25', color: 'var(--text-primary)' },
  { key: 'RSI Dip Level', val: '< 40', color: 'var(--text-primary)' },
  { key: 'Stop ATR Mult', val: '1.5x', color: 'var(--text-primary)' },
  { key: 'Target ATR Mult', val: '3.0x', color: 'var(--text-primary)' },
  { key: 'Bandit Updates', val: '0', color: 'var(--text-tertiary)' },
  { key: 'Next Optimization', val: '30 days', color: 'var(--text-tertiary)' },
]

export default function EngineStatus() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 16,
      border: '0.5px solid var(--border-subtle)', padding: '18px 20px',
      boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.2)',
    }}>
      {rows.map((r, i) => (
        <div key={r.key} style={{
          display: 'flex', justifyContent: 'space-between', padding: '8px 0',
          borderBottom: i < rows.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{r.key}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, color: r.color }}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}
