import React, { useState } from 'react'

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{
        width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'help', marginLeft: 5, verticalAlign: 'middle',
      }}>i</span>
      {show && (
        <div style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#111114', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
          padding: '10px 14px', width: 220, fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, zIndex: 9999,
          pointerEvents: 'none', whiteSpace: 'normal', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>{text}</div>
      )}
    </span>
  )
}
