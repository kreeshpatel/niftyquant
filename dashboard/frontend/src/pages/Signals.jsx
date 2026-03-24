import React, { useEffect, useState } from 'react'
import { fetchSignals } from '../api'
import { T, regimeColor } from '../theme'
import SignalCard from '../components/SignalCard'

export default function Signals() {
  const [data, setData] = useState({ signals: [], regime: '—', date: '' })
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchSignals().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Signal Scanner — {data.date}
        </span>
        <span style={{
          padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
          background: regimeColor(data.regime) + '18', color: regimeColor(data.regime),
          border: `1px solid ${regimeColor(data.regime)}30`,
        }}>{data.regime}</span>
        <span style={{ fontSize: 11, color: T.textMuted }}>{data.signals.length} signals</span>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.textDim, fontSize: 11 }}>
          SCANNING<span style={{ animation: 'blink 1s infinite' }}>_</span>
        </div>
      ) : data.signals.length === 0 ? (
        <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 40, textAlign: 'center', color: T.textDim, fontSize: 11, letterSpacing: 1 }}>
          {data.regime === 'BEAR' ? 'BEAR REGIME — ALL ENTRIES BLOCKED' : 'NO SIGNALS FOUND — ENTRY CONDITIONS NOT MET'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
          {data.signals.map(s => <SignalCard key={s.ticker} signal={s} />)}
        </div>
      )}
    </div>
  )
}
