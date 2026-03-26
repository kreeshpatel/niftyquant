import React, { useState, useEffect } from 'react'

export default function ScrollProgress() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setWidth(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, height: 2, zIndex: 9999,
      width: `${width}%`,
      background: 'linear-gradient(90deg, var(--purple), var(--green))',
      transition: 'width 0.1s linear',
      pointerEvents: 'none',
    }} />
  )
}
