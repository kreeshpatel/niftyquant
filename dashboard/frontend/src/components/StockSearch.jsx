import React, { useState, useRef, useEffect } from 'react'
import { searchTickers } from '../api'
import StockPanel from './StockPanel'

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
)

export default function StockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (query.length >= 1) {
      setResults(searchTickers(query))
      setShowDropdown(true)
    } else {
      setResults([])
      setShowDropdown(false)
    }
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setSelectedTicker(null)
        setShowDropdown(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (ticker) => {
    setSelectedTicker(ticker)
    setShowDropdown(false)
    setQuery('')
  }

  return (
    <>
      <div ref={wrapperRef} style={{ position: 'relative', marginLeft: 'auto', marginRight: 16 }}>
        <SearchIcon />
        <input
          ref={inputRef}
          id="stock-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 1 && setShowDropdown(true)}
          placeholder="Search stocks... &#8984;K"
          style={{
            width: 220, height: 34, padding: '0 12px 0 32px',
            background: 'var(--bg-glass)', border: '0.5px solid var(--border-subtle)',
            borderRadius: 'var(--r-md)', fontFamily: 'var(--mono)',
            fontSize: 13, color: 'var(--text-secondary)', outline: 'none',
            transition: 'border-color 0.2s var(--ease-out)',
          }}
          onFocuCapture={e => e.target.style.borderColor = 'var(--border-emphasis)'}
          onBlurCapture={e => { if (!showDropdown) e.target.style.borderColor = 'rgba(255,255,255,0.06)' }}
        />

        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            width: 320, background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)',
            borderRadius: 'var(--r-md)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            maxHeight: 320, overflowY: 'auto', zIndex: 9999,
          }}>
            {results.length === 0 ? (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No stocks found
              </div>
            ) : results.map(t => (
              <div key={t.ticker} onClick={() => handleSelect(t.ticker)} style={{
                padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center',
                cursor: 'pointer', transition: 'background 0.2s var(--ease-out)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                  background: 'var(--purple-d)', color: 'var(--accent-purple)',
                  padding: '3px 8px', borderRadius: 6, minWidth: 80, textAlign: 'center',
                }}>{t.ticker}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{t.sector}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTicker && (
        <StockPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}
    </>
  )
}
