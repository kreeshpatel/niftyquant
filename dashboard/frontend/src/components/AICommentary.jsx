import React, { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const CACHE_KEY = 'nq_ai_commentary'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

function SkeletonText() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="skeleton" style={{ width: '100%', height: 12 }} />
      <div className="skeleton" style={{ width: '75%', height: 12 }} />
    </div>
  )
}

export default function AICommentary({ regime = 'BEAR', breadth = '9.2', vix = '15.0', rsi = '33.9', adx = '28' }) {
  const [commentary, setCommentary] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [typing, setTyping] = useState(false)
  const typingRef = useRef(null)

  const typeText = useCallback((text) => {
    setTyping(true)
    setDisplayText('')
    let i = 0
    if (typingRef.current) clearInterval(typingRef.current)
    typingRef.current = setInterval(() => {
      i++
      setDisplayText(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(typingRef.current)
        setTyping(false)
      }
    }, 20)
  }, [])

  const fetchCommentary = useCallback(async (force = false) => {
    // Check sessionStorage cache
    if (!force) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { commentary: c, generated_at, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCommentary(c)
            setDisplayText(c)
            setGeneratedAt(generated_at)
            setLoading(false)
            return
          }
        }
      } catch {}
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ regime, breadth, vix, rsi, adx })
      const res = await fetch(`${API_BASE}/api/commentary?${params}`)
      const data = await res.json()
      setCommentary(data.commentary)
      setGeneratedAt(data.generated_at)
      setLoading(false)
      typeText(data.commentary)

      // Cache it
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        commentary: data.commentary,
        generated_at: data.generated_at,
        timestamp: Date.now(),
      }))
    } catch {
      const fallback = `Market breadth at ${breadth}% with Nifty RSI ${rsi} signals ${regime} conditions. Engine maintaining ${regime === 'BEAR' ? 'cash position' : 'selective entries'}.`
      setCommentary(fallback)
      setDisplayText(fallback)
      setGeneratedAt(new Date().toISOString())
      setLoading(false)
    }
  }, [regime, breadth, vix, rsi, adx, typeText])

  useEffect(() => {
    fetchCommentary()
    return () => { if (typingRef.current) clearInterval(typingRef.current) }
  }, [fetchCommentary])

  return (
    <div style={{
      background: 'rgba(129,140,248,0.05)',
      border: '1px solid rgba(129,140,248,0.15)',
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 12,
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <div style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: '#818cf8',
          boxShadow: '0 0 8px #818cf8',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
        }}>AI Commentary</span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {generatedAt && timeAgo(generatedAt)}
          <button
            onClick={() => fetchCommentary(true)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 13,
              padding: 0,
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = '#818cf8'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
            title="Refresh commentary"
          >{'\u21BB'}</button>
        </span>
      </div>

      <p style={{
        fontFamily: 'var(--mono)',
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.7,
        margin: 0,
        minHeight: 34,
      }}>
        {loading ? <SkeletonText /> : (
          <>
            {displayText}
            {typing && (
              <span style={{
                display: 'inline-block',
                width: 2,
                height: 14,
                background: '#818cf8',
                marginLeft: 2,
                animation: 'pulse 1s infinite',
                verticalAlign: 'text-bottom',
              }} />
            )}
          </>
        )}
      </p>
    </div>
  )
}
