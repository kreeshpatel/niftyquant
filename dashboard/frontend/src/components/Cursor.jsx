import React, { useState, useEffect, useRef } from 'react'

export default function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 })
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)
  const ringRef = useRef({ x: -100, y: -100 })
  const rafRef = useRef(null)

  useEffect(() => {
    // Only show on desktop with fine pointer
    if (window.matchMedia('(pointer: fine)').matches === false) return

    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    // Check hovering on interactive elements
    const onOver = (e) => {
      const t = e.target.closest('button, a, [role="button"], input, select, [data-clickable], tr[style*="cursor"]')
      setHovering(!!t)
    }
    document.addEventListener('mouseover', onOver)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('mouseover', onOver)
    }
  }, [])

  // Smooth ring follow
  useEffect(() => {
    const animate = () => {
      ringRef.current.x += (pos.x - ringRef.current.x) * 0.15
      ringRef.current.y += (pos.y - ringRef.current.y) * 0.15
      setRingPos({ x: ringRef.current.x, y: ringRef.current.y })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [pos])

  if (!visible) return null

  const ringSize = hovering ? 36 : 24

  return (
    <>
      <div style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 99999,
        left: pos.x - 3, top: pos.y - 3,
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--purple)', opacity: 0.8,
        transition: 'opacity 0.15s',
      }} />
      <div style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 99998,
        left: ringPos.x - ringSize / 2, top: ringPos.y - ringSize / 2,
        width: ringSize, height: ringSize, borderRadius: '50%',
        border: '1px solid rgba(129,140,248,0.25)',
        transition: 'width 0.2s ease, height 0.2s ease, left 0.05s, top 0.05s',
        opacity: 0.6,
      }} />
    </>
  )
}
