import React from 'react'

export default function TopLoader({ loading }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      height: 2,
      width: loading ? '70%' : '100%',
      background: 'linear-gradient(90deg, #818cf8, #34d399)',
      opacity: loading ? 1 : 0,
      transition: loading ? 'width 2s ease' : 'opacity 0.3s ease 0.2s',
      zIndex: 9999,
      borderRadius: '0 1px 1px 0',
      pointerEvents: 'none',
    }} />
  )
}
