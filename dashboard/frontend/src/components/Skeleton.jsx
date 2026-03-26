import React from 'react'

export default function Skeleton({ width = '100%', height = 20, style }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, #ffffff06 25%, #ffffff10 50%, #ffffff06 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

export function SkeletonBlock({ height = 80 }) {
  return <Skeleton width="100%" height={height} style={{ borderRadius: 'var(--radius-lg)' }} />
}
