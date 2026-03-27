import React from 'react'

// Placeholder news data — in production, this would connect to a news API
const DEMO_NEWS = [
  { id: 1, time: '14:32', headline: 'RBI holds repo rate at 6.5%, maintains accommodative stance', sentiment: 'neutral', source: 'ET' },
  { id: 2, time: '13:45', headline: 'FII outflows continue for 5th session, sold Rs 2,400 crore today', sentiment: 'bearish', source: 'MC' },
  { id: 3, time: '12:10', headline: 'HDFC Bank Q4 results beat estimates, NIM improves 10bps', sentiment: 'bullish', source: 'BS' },
  { id: 4, time: '11:30', headline: 'IT sector rallies on weak USD, TCS, Infosys lead gains', sentiment: 'bullish', source: 'LM' },
  { id: 5, time: '10:15', headline: 'Metals under pressure as China PMI data disappoints', sentiment: 'bearish', source: 'ET' },
  { id: 6, time: '09:45', headline: 'Nifty opens gap down, 22400 key support level to watch', sentiment: 'bearish', source: 'MC' },
  { id: 7, time: '09:30', headline: 'SGX Nifty indicates flat opening, global cues mixed', sentiment: 'neutral', source: 'BS' },
]

function SentimentDot({ sentiment }) {
  const color = sentiment === 'bullish' ? 'var(--green)' : sentiment === 'bearish' ? 'var(--red)' : 'var(--text-muted)'
  return <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

export default function NewsWidget() {
  return (
    <div className="widget">
      <div className="widget-header">
        <span>Market News</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Live</span>
      </div>
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {DEMO_NEWS.map(n => (
          <div key={n.id} style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
            cursor: 'default',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <SentimentDot sentiment={n.sentiment} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.headline}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 10, color: 'var(--text-muted)' }}>
                <span>{n.time} IST</span>
                <span>{n.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
