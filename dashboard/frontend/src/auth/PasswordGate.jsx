import React, { useState } from 'react'
import { ACCESS_HASH } from './config'

const styles = {
  wrapper: {
    position: 'fixed', inset: 0, background: '#0a0a0a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  },
  logo: {
    fontSize: 28, fontWeight: 700, color: '#f59e0b', letterSpacing: 6, marginBottom: 8,
  },
  sub: {
    fontSize: 11, color: '#444', letterSpacing: 3, marginBottom: 40, textTransform: 'uppercase',
  },
  input: {
    width: 280, padding: '10px 14px', background: '#111', border: '1px solid #333',
    color: '#c8c8b4', fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    textAlign: 'center', outline: 'none', letterSpacing: 2,
  },
  btn: {
    width: 280, padding: '10px 0', marginTop: 12, background: 'transparent',
    border: '1px solid #333', color: '#666', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  error: {
    color: '#ef4444', fontSize: 11, letterSpacing: 2, marginTop: 16,
    textTransform: 'uppercase',
  },
}

async function hashPassword(pw) {
  const encoded = new TextEncoder().encode(pw)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const hash = await hashPassword(pw)
    if (hash === ACCESS_HASH) {
      sessionStorage.setItem('nq_auth', 'true')
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPw('')
    }
  }

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        .shake { animation: shake 0.3s ease-in-out; }
        .gate-btn:hover { border-color: #f59e0b !important; color: #f59e0b !important; }
        .gate-input:focus { border-color: #f59e0b !important; }
      `}</style>
      <div style={styles.logo}>NIFTYQUANT</div>
      <div style={styles.sub}>Algorithmic Trading System</div>
      <form onSubmit={handleSubmit} className={shake ? 'shake' : ''}>
        <input
          className="gate-input"
          type="password" value={pw} onChange={e => { setPw(e.target.value); setError(false) }}
          placeholder="ENTER ACCESS CODE" style={styles.input} autoFocus
        />
        <button className="gate-btn" type="submit" style={styles.btn}>AUTHENTICATE</button>
      </form>
      {error && <div style={styles.error}>ACCESS DENIED</div>}
    </div>
  )
}
