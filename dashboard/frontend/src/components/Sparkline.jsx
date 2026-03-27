import React, { useMemo } from 'react'

export default function Sparkline({ data, width = 64, height = 22, color }) {
  const { path, areaPath, lineColor, endX, endY } = useMemo(() => {
    if (!data || data.length < 2) return { path: '', areaPath: '', lineColor: 'var(--text-muted)', endX: 0, endY: 0 }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * height,
    }))
    const p = 'M' + pts.map(pt => `${pt.x},${pt.y}`).join(' L')
    const a = p + ` L${width},${height} L0,${height} Z`
    const isUp = data[data.length - 1] >= data[0]
    const lc = color || (isUp ? '#00C896' : '#FF453A')
    return { path: p, areaPath: a, lineColor: lc, endX: pts[pts.length - 1].x, endY: pts[pts.length - 1].y }
  }, [data, width, height, color])

  if (!data || data.length < 2) return null

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={areaPath} fill={lineColor === '#00C896' ? 'rgba(0,200,150,0.08)' : 'rgba(255,69,58,0.08)'} />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r="2" fill={lineColor} />
    </svg>
  )
}
