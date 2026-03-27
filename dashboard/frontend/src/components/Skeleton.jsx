import React from 'react'

export default function Skeleton({ width = '100%', height = 20, style }) {
  return (
    <div style={{
      width, height, borderRadius: 8,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

export function SkeletonBlock({ height = 80 }) {
  return <Skeleton width="100%" height={height} style={{ borderRadius: 16 }} />
}
