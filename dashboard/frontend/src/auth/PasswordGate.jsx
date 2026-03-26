import React, { useState } from 'react'
const ACCESS_HASH = import.meta.env.VITE_ACCESS_HASH

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
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 36, fontWeight: 800, letterSpacing: -2, marginBottom: 8,
        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontFamily: 'var(--text-display)',
      }}>NiftyQuant</div>
      <div style={{
        fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)',
        letterSpacing: 3, textTransform: 'uppercase', marginBottom: 48,
      }}>Adaptive Trading Engine</div>
      <form onSubmit={handleSubmit} className={shake ? 'shake' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="password" value={pw}
          onChange={e => { setPw(e.target.value); setError(false) }}
          placeholder="enter access code" autoFocus
          style={{
            width: 320, height: 48, padding: '0 16px',
            background: '#ffffff08', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--text-mono)', fontSize: 14, textAlign: 'center',
            color: 'var(--text-primary)', letterSpacing: 4, outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--purple-border)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button type="submit" style={{
          width: 320, height: 48, marginTop: 12,
          background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
          border: 'none', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--text-display)', fontSize: 13, fontWeight: 700,
          color: 'white', letterSpacing: 1, cursor: 'pointer',
        }}>AUTHENTICATE</button>
      </form>
      {error && <div style={{
        fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--red)',
        letterSpacing: 3, marginTop: 16,
      }}>ACCESS DENIED</div>}
    </div>
  )
}
