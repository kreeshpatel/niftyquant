import React from 'react'

const shortcuts = [
  { section: 'Navigation', items: [
    ['G then O', 'Overview'], ['G then S', 'Screener'], ['G then N', 'Signals'],
    ['G then A', 'Analytics'], ['G then B', 'Backtest'], ['G then T', 'Trades'],
  ]},
  { section: 'Actions', items: [
    ['/', 'Focus search'], ['\u2318K', 'Command palette'],
    ['ESC', 'Close / go back'], ['?', 'Show this panel'],
  ]},
]

function Key({ children }) {
  return <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '2px 7px',
    display: 'inline-block', minWidth: 24, textAlign: 'center',
  }}>{children}</span>
}

export default function ShortcutsModal({ onClose }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 9998,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '28px 32px', width: 'min(440px, 90vw)', zIndex: 9999,
        boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Keyboard shortcuts</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18 }}>&times;</div>
        </div>
        {shortcuts.map(s => (
          <div key={s.section} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>{s.section}</div>
            {s.items.map(([keys, desc]) => (
              <div key={desc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
                <span style={{ display: 'flex', gap: 4 }}>{keys.split(' ').map((k, i) => <Key key={i}>{k}</Key>)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
