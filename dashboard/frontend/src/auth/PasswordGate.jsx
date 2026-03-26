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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const hash = await hashPassword(pw)
    if (hash === ACCESS_HASH) {
      sessionStorage.setItem('nq_auth', 'true')
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setLoading(false)
      setTimeout(() => setShake(false), 500)
      setPw('')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ animation: 'scaleIn 0.5s ease both' }}>
        {/* Logo */}
        <div style={{
          fontSize: 40, fontWeight: 800, letterSpacing: -2, marginBottom: 8, textAlign: 'center',
          background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'var(--sans)',
          animation: 'float 3s ease-in-out infinite',
        }}>NiftyQuant</div>

        {/* Tagline */}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)',
          letterSpacing: 4, textTransform: 'uppercase', marginBottom: 56, textAlign: 'center',
        }}>Adaptive Trading Intelligence</div>

        {/* Version badge */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{
            display: 'inline-block', fontFamily: 'var(--mono)', fontSize: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '5px 14px', color: 'var(--purple)',
            backdropFilter: 'blur(20px)',
          }}>v3.0 · Sharpe 0.67 · +43.2%</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={shake ? 'shake' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            type="password" value={pw}
            onChange={e => { setPw(e.target.value); setError(false) }}
            placeholder="· · · · · · · ·" autoFocus
            style={{
              width: 320, height: 52, padding: '0 16px',
              background: 'var(--bg-card)', border: `1px solid ${error ? 'var(--red-b)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--mono)', fontSize: 15, textAlign: 'center',
              color: 'var(--text)', letterSpacing: 6, outline: 'none',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.2s',
              boxShadow: error ? '0 0 0 3px var(--red-d)' : 'none',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--purple-b)'; e.target.style.boxShadow = '0 0 0 3px var(--purple-d)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
          <button type="submit" disabled={loading} style={{
            width: 320, height: 52, marginTop: 12,
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            border: 'none', borderRadius: 'var(--r-md)',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700,
            color: 'white', letterSpacing: 2, cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
            onMouseEnter={e => { e.target.style.filter = 'brightness(1.1)'; e.target.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.target.style.filter = 'none'; e.target.style.transform = 'none' }}
            onMouseDown={e => e.target.style.transform = 'scale(0.99)'}
            onMouseUp={e => e.target.style.transform = 'translateY(-1px)'}
          >{loading ? 'VERIFYING...' : 'AUTHENTICATE'}</button>
        </form>

        {error && <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)',
          letterSpacing: 3, marginTop: 16, textAlign: 'center',
        }}>ACCESS DENIED</div>}
      </div>
    </div>
  )
}
