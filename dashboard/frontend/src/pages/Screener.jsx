import React, { useEffect, useState } from 'react'
import { fetchScreener } from '../api'
import StockPanel from '../components/StockPanel'
import Skeleton from '../components/Skeleton'

const SECTORS = ['ALL', 'Banking', 'IT', 'Energy', 'Auto', 'FMCG', 'Pharma', 'Finance', 'Metals', 'Cement', 'Telecom', 'Infrastructure', 'Consumer', 'Chemicals', 'Realty', 'Others']
const SIGNALS = ['ALL', 'BUY', 'WATCHLIST', 'NEUTRAL']
const SORT_OPTIONS = [
  { key: 'momentum_score', label: 'Momentum' },
  { key: 'adx', label: 'ADX' },
  { key: 'rsi', label: 'RSI' },
  { key: 'volume_ratio', label: 'Volume' },
  { key: 'return_1d', label: '1D Return' },
]

const sel = { padding: '5px 10px', background: '#ffffff08', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }

export default function Screener() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('ALL')
  const [signal, setSignal] = useState('ALL')
  const [sortBy, setSortBy] = useState('momentum_score')
  const [shown, setShown] = useState(50)
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchScreener().then(setData) }, [])

  if (!data) return <div className="page-enter"><Skeleton height={40} style={{ marginBottom: 12 }} /><Skeleton height={400} /></div>

  let filtered = data
  if (search) filtered = filtered.filter(r => r.ticker.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()))
  if (sector !== 'ALL') filtered = filtered.filter(r => r.sector === sector)
  if (signal !== 'ALL') filtered = filtered.filter(r => r.signal === signal)
  filtered = [...filtered].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  const buys = data.filter(r => r.signal === 'BUY').length
  const watchlist = data.filter(r => r.signal === 'WATCHLIST').length
  const neutral = data.length - buys - watchlist

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>Live screener</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>{data.length} stocks · updated daily</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Pill color="var(--green)">{buys} BUY signals</Pill>
        <Pill color="var(--amber)">{watchlist} on watchlist</Pill>
        <Pill color="var(--text-dim)">{neutral} neutral</Pill>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 14px', marginBottom: 12 }} className="glass">
        <input placeholder="Search ticker..." value={search} onChange={e => { setSearch(e.target.value); setShown(50) }} style={{ ...sel, width: 140 }} />
        <select value={sector} onChange={e => { setSector(e.target.value); setShown(50) }} style={sel}>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select value={signal} onChange={e => { setSignal(e.target.value); setShown(50) }} style={sel}>{SIGNALS.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}>{SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>Sort: {o.label}</option>)}</select>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto', alignSelf: 'center' }}>{filtered.length} results</span>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Ticker', 'Signal', 'Sector', 'Price', '1D%', 'ADX', 'RSI', 'Momentum', 'Volume', ''].map(h =>
              <th key={h} style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', textAlign: h === 'Price' || h === '1D%' || h === 'ADX' || h === 'RSI' || h === 'Volume' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((r, i) => (
              <tr key={r.ticker} onClick={() => setSelected(r.ticker)} style={{
                cursor: 'pointer', transition: 'background 0.1s',
                borderLeft: r.signal === 'BUY' ? '2px solid var(--green)' : r.signal === 'WATCHLIST' ? '2px solid var(--amber)' : '2px solid transparent',
                background: r.signal === 'BUY' ? 'rgba(52,211,153,0.03)' : 'transparent',
                animation: `fadeUp 0.4s ease both`,
                animationDelay: `${Math.min(i * 20, 400)}ms`,
              }}
                onMouseEnter={e => e.currentTarget.style.background = r.signal === 'BUY' ? 'rgba(52,211,153,0.06)' : 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = r.signal === 'BUY' ? 'rgba(52,211,153,0.03)' : 'transparent'}>
                <td style={td}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--purple)' }}>{r.ticker}</div><div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{r.name}</div></td>
                <td style={td}><SignalBadge signal={r.signal} dips={r.dip_count} /></td>
                <td style={{ ...td, fontSize: 10, color: 'var(--text-dim)' }}>{r.sector}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.close?.toLocaleString('en-IN')}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.return_1d >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.return_1d >= 0 ? '+' : ''}{r.return_1d}%</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}><span style={{ marginRight: 4 }}>{r.adx?.toFixed(0)}</span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: r.adx > 30 ? 'var(--green)' : r.adx > 20 ? 'var(--amber)' : 'var(--red)', boxShadow: r.adx > 30 ? '0 0 6px var(--green)' : r.adx > 20 ? '0 0 6px var(--amber)' : '0 0 6px var(--red)' }} /></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.rsi > 70 ? 'var(--red)' : r.rsi > 50 ? 'var(--green)' : r.rsi > 30 ? 'var(--amber)' : 'var(--blue)' }}>{r.rsi?.toFixed(0)}</td>
                <td style={td}><div style={{ width: 60, height: 4, background: '#ffffff08', borderRadius: 2 }}><div style={{ height: '100%', width: `${(r.momentum_score || 0) * 100}%`, background: 'linear-gradient(90deg, var(--purple), var(--blue))', borderRadius: 2, transition: 'width 0.5s ease' }} /></div></td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.volume_ratio > 2 ? 'var(--green)' : r.volume_ratio > 1 ? 'var(--amber)' : 'var(--text-dim)' }}>{r.volume_ratio?.toFixed(1)}x</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple)' }}>View &rarr;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => setShown(s => s + 50)} style={{ padding: '8px 24px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>Show more ({filtered.length - shown} remaining)</button>
        </div>
      )}

      {selected && <StockPanel ticker={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

const td = { padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, borderBottom: '1px solid #ffffff05', whiteSpace: 'nowrap' }

function Pill({ color, children }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 10px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30` }}>{children}</span>
}

function SignalBadge({ signal, dips }) {
  if (signal === 'BUY') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px', borderRadius: 12, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>BUY · {dips} dips</span>
  if (signal === 'WATCHLIST') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px', borderRadius: 12, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)' }}>WATCHLIST</span>
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>&mdash;</span>
}
