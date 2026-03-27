import React, { useState } from 'react'
import { usePortfolioContext } from '../../context/PortfolioContext'

const STRATEGIES = ['Pre-Move', 'Breakout', 'Pullback', 'Momentum', 'Reversal', 'Earnings', 'Sector Rotation', 'Other']

export default function AddTradeModal({ onClose }) {
  const { addTrade } = usePortfolioContext()
  const [form, setForm] = useState({
    ticker: '', side: 'LONG', quantity: '',
    entry_price: '', entry_date: new Date().toISOString().split('T')[0],
    exit_price: '', exit_date: '',
    stop_loss: '', target: '', strategy: 'Pre-Move',
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.ticker || !form.quantity || !form.entry_price) return
    addTrade({
      ticker: form.ticker.toUpperCase(),
      side: form.side,
      quantity: Number(form.quantity),
      entry_price: Number(form.entry_price),
      entry_date: form.entry_date,
      exit_price: form.exit_price ? Number(form.exit_price) : null,
      exit_date: form.exit_date || null,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
      target: form.target ? Number(form.target) : null,
      strategy: form.strategy,
      source: 'manual',
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--mono)',
  }
  const labelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-widget)', border: '1px solid var(--border-widget)',
        borderRadius: 'var(--r-lg)', width: 440, maxHeight: '90vh', overflow: 'auto',
        animation: 'scaleIn 0.2s ease both',
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border-widget)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Add Trade</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>TICKER</label>
              <input value={form.ticker} onChange={e => set('ticker', e.target.value)} placeholder="TATASTEEL" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>SIDE</label>
              <select value={form.side} onChange={e => set('side', e.target.value)} style={inputStyle}>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>QUANTITY</label>
              <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="500" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>ENTRY PRICE</label>
              <input type="number" step="0.01" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} placeholder="142.30" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>ENTRY DATE</label>
              <input type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>EXIT PRICE (if closed)</label>
              <input type="number" step="0.01" value={form.exit_price} onChange={e => set('exit_price', e.target.value)} placeholder="--" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>EXIT DATE</label>
              <input type="date" value={form.exit_date} onChange={e => set('exit_date', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>STOP LOSS</label>
              <input type="number" step="0.01" value={form.stop_loss} onChange={e => set('stop_loss', e.target.value)} placeholder="--" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>TARGET</label>
              <input type="number" step="0.01" value={form.target} onChange={e => set('target', e.target.value)} placeholder="--" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>STRATEGY</label>
              <select value={form.strategy} onChange={e => set('strategy', e.target.value)} style={inputStyle}>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Trade</button>
          </div>
        </form>
      </div>
    </div>
  )
}
