import React, { useState, useMemo } from 'react'
import { usePortfolioContext } from '../context/PortfolioContext'
import { formatINR } from '../utils/pnlCalculations'

const STRATEGIES = ['All', 'Pre-Move', 'Breakout', 'Pullback', 'Momentum', 'Reversal', 'Earnings', 'Sector Rotation', 'Other']

function TradeEntryCard({ trade, journal, onEditJournal }) {
  const entry = journal.find(j => j.trade_id === trade.id)
  const isWin = (trade.pnl || 0) > 0
  const pnlPct = trade.pnl_pct || 0

  return (
    <div className="widget" style={{
      borderLeft: `3px solid ${isWin ? 'var(--green)' : 'var(--red)'}`,
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{trade.ticker}</span>
            <span className={`badge ${isWin ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 8 }}>
              {isWin ? 'WIN' : 'LOSS'}
            </span>
            {trade.strategy && (
              <span className="badge badge-purple" style={{ marginLeft: 4 }}>{trade.strategy}</span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: isWin ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {trade.exit_date || trade.entry_date}
            </div>
          </div>
        </div>

        {/* Trade details */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          <span>Entry: \u20B9{trade.entry_price}</span>
          {trade.exit_price && <span>Exit: \u20B9{trade.exit_price}</span>}
          <span>Qty: {trade.quantity}</span>
          <span>P&L: <span style={{ color: isWin ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{formatINR(trade.pnl)}</span></span>
        </div>

        {/* Notes */}
        {entry?.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            {entry.notes}
          </div>
        )}

        {/* Lesson */}
        {entry?.lessons && (
          <div style={{
            padding: '8px 10px', borderRadius: 4,
            background: 'var(--amber-d)', border: '1px solid var(--amber-b)',
            fontSize: 11, color: 'var(--amber)', lineHeight: 1.5, marginBottom: 8,
          }}>
            <span style={{ fontWeight: 700 }}>LESSON:</span> {entry.lessons}
          </div>
        )}

        {/* Tags + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(entry?.tags || []).map(tag => (
              <span key={tag} style={{
                fontSize: 10, color: 'var(--cyan)', background: 'var(--cyan-d)',
                padding: '2px 6px', borderRadius: 3,
              }}>#{tag}</span>
            ))}
          </div>
          <button onClick={() => onEditJournal(trade)} className="btn" style={{ fontSize: 10, padding: '3px 10px' }}>
            {entry ? 'EDIT' : 'ADD NOTES'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JournalForm({ trade, existingEntry, onSave, onClose }) {
  const [notes, setNotes] = useState(existingEntry?.notes || '')
  const [lessons, setLessons] = useState(existingEntry?.lessons || '')
  const [tags, setTags] = useState((existingEntry?.tags || []).join(', '))
  const [rating, setRating] = useState(existingEntry?.rating || 3)

  const handleSave = () => {
    onSave({
      trade_id: trade.id,
      notes, lessons,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      rating,
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--mono)', resize: 'vertical',
  }
  const labelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-widget)', border: '1px solid var(--border-widget)',
        borderRadius: 'var(--r-lg)', width: 480, maxHeight: '90vh', overflow: 'auto',
        animation: 'scaleIn 0.2s ease both',
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border-widget)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Journal — {trade.ticker}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="What happened? Why did you enter?" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>LESSONS LEARNED</label>
            <textarea value={lessons} onChange={e => setLessons(e.target.value)} rows={2} placeholder="What would you do differently?" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>TAGS (comma separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="pre-move, breakout, metals" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>EXECUTION RATING</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: n <= rating ? 'var(--green-d)' : 'var(--bg-elevated)',
                  border: `1px solid ${n <= rating ? 'var(--green-b)' : 'var(--border-widget)'}`,
                  color: n <= rating ? 'var(--green)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} className="btn">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Journal() {
  const { trades, journal, addJournalEntry, updateJournalEntry } = usePortfolioContext()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, win, loss
  const [strategyFilter, setStrategyFilter] = useState('All')
  const [editingTrade, setEditingTrade] = useState(null)

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (search && !t.ticker?.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter === 'win' && (t.pnl || 0) <= 0) return false
      if (statusFilter === 'loss' && (t.pnl || 0) > 0) return false
      if (strategyFilter !== 'All' && t.strategy !== strategyFilter) return false
      return true
    })
  }, [trades, search, statusFilter, strategyFilter])

  const stats = useMemo(() => {
    const wins = filtered.filter(t => (t.pnl || 0) > 0)
    return {
      total: filtered.length,
      winRate: filtered.length > 0 ? Math.round(wins.length / filtered.length * 100) : 0,
      totalPnl: filtered.reduce((s, t) => s + (t.pnl || 0), 0),
      avgPnl: filtered.length > 0 ? filtered.reduce((s, t) => s + (t.pnl || 0), 0) / filtered.length : 0,
    }
  }, [filtered])

  const handleSaveJournal = (entry) => {
    const existing = journal.find(j => j.trade_id === entry.trade_id)
    if (existing) {
      updateJournalEntry(existing.id, entry)
    } else {
      addJournalEntry(entry)
    }
  }

  return (
    <div className="anim-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Trade Journal</h1>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Track trades, notes, lessons, and patterns</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">EXPORT</button>
          <button className="btn" style={{ color: 'var(--purple)' }}>INSIGHTS</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        padding: '10px 12px', marginBottom: 12,
        background: 'var(--bg-widget)', border: '1px solid var(--border-widget)', borderRadius: 'var(--r-md)',
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticker or notes..." style={{
          width: 200, padding: '6px 10px', borderRadius: 4,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
          color: 'var(--text-secondary)', fontSize: 12, outline: 'none',
          fontFamily: 'var(--mono)',
        }} />

        <div style={{ display: 'flex', gap: 3 }}>
          {['all', 'win', 'loss'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              border: '1px solid', cursor: 'pointer', fontFamily: 'var(--mono)',
              borderColor: statusFilter === f ? (f === 'win' ? 'var(--green-b)' : f === 'loss' ? 'var(--red-b)' : 'var(--border-default)') : 'var(--border-widget)',
              background: statusFilter === f ? (f === 'win' ? 'var(--green-d)' : f === 'loss' ? 'var(--red-d)' : 'var(--bg-active)') : 'transparent',
              color: statusFilter === f ? (f === 'win' ? 'var(--green)' : f === 'loss' ? 'var(--red)' : 'var(--text-primary)') : 'var(--text-tertiary)',
            }}>{f.toUpperCase()}</button>
          ))}
        </div>

        <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)} style={{
          padding: '5px 8px', borderRadius: 4,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
          color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--mono)',
        }}>
          {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 12px', marginBottom: 12,
        background: 'var(--bg-widget)', border: '1px solid var(--border-widget)', borderRadius: 'var(--r-md)',
        fontSize: 11, color: 'var(--text-tertiary)',
      }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong> trades</span>
        <span><strong style={{ color: stats.winRate > 50 ? 'var(--green)' : 'var(--amber)' }}>{stats.winRate}%</strong> win rate</span>
        <span>Total: <strong style={{ color: stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(stats.totalPnl)}</strong></span>
        <span>Avg: <strong style={{ color: stats.avgPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(stats.avgPnl)}</strong></span>
      </div>

      {/* Trade entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 48, textAlign: 'center',
            background: 'var(--bg-widget)', border: '1px solid var(--border-widget)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 8 }}>No trades yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Add trades via Portfolio page or connect Zerodha to auto-sync.
            </div>
          </div>
        ) : (
          filtered.map(trade => (
            <TradeEntryCard
              key={trade.id}
              trade={trade}
              journal={journal}
              onEditJournal={setEditingTrade}
            />
          ))
        )}
      </div>

      {editingTrade && (
        <JournalForm
          trade={editingTrade}
          existingEntry={journal.find(j => j.trade_id === editingTrade.id)}
          onSave={handleSaveJournal}
          onClose={() => setEditingTrade(null)}
        />
      )}
    </div>
  )
}
