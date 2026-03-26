import React from 'react'

const rows = [
  { key: 'Active Model', val: 'base_v2', color: 'var(--purple)' },
  { key: 'Model AUC', val: '0.595', color: 'var(--green)' },
  { key: 'ADX Threshold', val: '> 25', color: 'var(--text-primary)' },
  { key: 'RSI Dip Level', val: '< 40', color: 'var(--text-primary)' },
  { key: 'Stop ATR Mult', val: '1.5x', color: 'var(--text-primary)' },
  { key: 'Target ATR Mult', val: '3.0x', color: 'var(--text-primary)' },
  { key: 'Bandit Updates', val: '0', color: 'var(--text-dim)' },
  { key: 'Next Optimization', val: '30 days', color: 'var(--text-dim)' },
]

export default function EngineStatus() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', padding: '18px 20px',
    }}>
      {rows.map((r, i) => (
        <div key={r.key} style={{
          display: 'flex', justifyContent: 'space-between', padding: '8px 0',
          borderBottom: i < rows.length - 1 ? '1px solid #ffffff06' : 'none',
        }}>
          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{r.key}</span>
          <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, fontWeight: 500, color: r.color }}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}
