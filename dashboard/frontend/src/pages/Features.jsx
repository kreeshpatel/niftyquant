import React, { useEffect, useState } from 'react'
import { fetchPositions } from '../api'
import { T } from '../theme'

export default function Features() {
  const [features, setFeatures] = useState([])
  useEffect(() => { fetchPositions().then(setFeatures).catch(() => {}) }, [])

  const maxImp = Math.max(...features.map(f => f.importance || 0), 0.001)

  return (
    <div>
      <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16 }}>
        <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>
          ML Feature Importance
        </div>
        {features.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: 11 }}>
            NO FEATURE DATA — ADD feature_importance.csv TO results/
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {features.slice(0, 30).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                <span style={{
                  width: 20, fontSize: 10, color: T.textDim, textAlign: 'right',
                }}>{i + 1}</span>
                <span style={{
                  width: 200, fontSize: 11, color: T.textPrimary, fontFamily: T.font,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{f.feature}</span>
                <div style={{ flex: 1, height: 16, background: T.bgBase, position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${(f.importance / maxImp * 100).toFixed(1)}%`,
                    background: `linear-gradient(90deg, ${T.amber}40, ${T.amber})`,
                  }} />
                </div>
                <span style={{
                  width: 60, fontSize: 10, color: T.textMuted, textAlign: 'right',
                }}>{f.importance.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
