import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const METRICS = [
  { label: 'Win Rate', value: 39.8, max: 100, color: 0x34d399 },
  { label: 'Profit Factor', value: 1.19, max: 3, color: 0x818cf8 },
  { label: 'Sharpe', value: 0.67, max: 2, color: 0x60a5fa },
  { label: 'Avg Win', value: 9.5, max: 20, color: 0x34d399 },
  { label: 'Avg Loss', value: 5.0, max: 20, color: 0xf87171 },
  { label: 'Trades/yr', value: 7.5, max: 20, color: 0xfbbf24 },
]

export default function Portfolio3D() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredMetric, setHoveredMetric] = useState(null)
  const sceneRef = useRef({})

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x080810)
    scene.fog = new THREE.Fog(0x080810, 15, 30)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 8, 12)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const point = new THREE.PointLight(0x818cf8, 2, 100)
    point.position.set(5, 10, 5)
    scene.add(point)
    const point2 = new THREE.PointLight(0x34d399, 1, 100)
    point2.position.set(-5, 8, -3)
    scene.add(point2)

    // Floor grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x1a1a2e, 0x1a1a2e)
    scene.add(gridHelper)

    // Bars
    const bars = []
    const targetScales = []

    METRICS.forEach((m, i) => {
      const height = (m.value / m.max) * 8
      const geometry = new THREE.BoxGeometry(1.2, height, 1.2)
      const material = new THREE.MeshPhongMaterial({
        color: m.color,
        transparent: true,
        opacity: 0.85,
        shininess: 100,
      })
      const bar = new THREE.Mesh(geometry, material)
      bar.position.set((i - METRICS.length / 2) * 2.2 + 1.1, height / 2, 0)
      bar.scale.y = 0.001
      bar.userData = { index: i, metric: m }
      scene.add(bar)
      bars.push(bar)
      targetScales.push(1)
    })

    sceneRef.current = { bars, scene, camera, renderer }

    // Particles
    const particles = []
    for (let i = 0; i < 50; i++) {
      const geo = new THREE.SphereGeometry(0.03, 8, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.3,
      })
      const particle = new THREE.Mesh(geo, mat)
      particle.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 15,
        (Math.random() - 0.5) * 20,
      )
      particle.userData.speed = 0.005 + Math.random() * 0.01
      scene.add(particle)
      particles.push(particle)
    }

    // Animation state
    let angle = 0
    let isDragging = false
    let prevMouseX = 0
    let dragAngleOffset = 0
    const startTime = performance.now()

    // Raycaster for hover
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging) {
        const delta = (e.clientX - prevMouseX) * 0.005
        dragAngleOffset += delta
        prevMouseX = e.clientX
      }

      // Raycast
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(bars)
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.index
        setHoveredMetric(METRICS[idx])
        bars.forEach((b, bi) => {
          b.material.opacity = bi === idx ? 1.0 : 0.3
        })
        container.style.cursor = 'pointer'
      } else {
        setHoveredMetric(null)
        bars.forEach(b => { b.material.opacity = 0.85 })
        container.style.cursor = isDragging ? 'grabbing' : 'grab'
      }
    }

    const onMouseDown = (e) => {
      isDragging = true
      prevMouseX = e.clientX
      container.style.cursor = 'grabbing'
    }
    const onMouseUp = () => {
      isDragging = false
      container.style.cursor = 'grab'
    }

    const onWheel = (e) => {
      camera.position.y = Math.max(3, Math.min(15, camera.position.y + e.deltaY * 0.01))
    }

    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('wheel', onWheel, { passive: true })

    // Animation loop
    let animFrame
    const animate = () => {
      animFrame = requestAnimationFrame(animate)
      const elapsed = (performance.now() - startTime) / 1000

      // Animate bars rising
      bars.forEach((bar, i) => {
        const delay = i * 0.15
        const progress = Math.min(1, Math.max(0, (elapsed - delay) / 0.8))
        const eased = 1 - Math.pow(1 - progress, 3)
        bar.scale.y = Math.max(0.001, eased * targetScales[i])
      })

      // Particles
      particles.forEach(p => {
        p.position.y += p.userData.speed
        if (p.position.y > 15) p.position.y = -1
      })

      // Camera auto-rotate
      if (!isDragging) {
        angle += 0.003
      }
      const totalAngle = angle + dragAngleOffset
      const radius = 12
      camera.position.x = Math.sin(totalAngle) * radius
      camera.position.z = Math.cos(totalAngle) * radius
      camera.lookAt(0, 3, 0)

      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrame)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
    }
  }, [])

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: 'calc(100vh - 120px)',
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      cursor: 'grab',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Overlay panel */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(8,8,16,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 18,
        minWidth: 220,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
          color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
          marginBottom: 12,
        }}>Portfolio Metrics · 3D View</div>

        {METRICS.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 0',
            opacity: hoveredMetric && hoveredMetric.label !== m.label ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-sub)',
            }}>{m.label}</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              color: `#${m.color.toString(16).padStart(6, '0')}`,
            }}>
              {m.label === 'Win Rate' ? `${m.value}%` :
               m.label === 'Avg Win' ? `+${m.value}%` :
               m.label === 'Avg Loss' ? `-${m.value}%` :
               m.label === 'Trades/yr' ? m.value.toFixed(1) :
               m.value.toFixed(2)}
            </span>
          </div>
        ))}

        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
        }}>
          Drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* Metric spotlight on hover */}
      {hoveredMetric && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,8,16,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '12px 24px',
          textAlign: 'center',
          animation: 'fadeUp 0.2s ease',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
            marginBottom: 4,
          }}>{hoveredMetric.label}</div>
          <div style={{
            fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800,
            color: `#${hoveredMetric.color.toString(16).padStart(6, '0')}`,
          }}>
            {hoveredMetric.label === 'Win Rate' ? `${hoveredMetric.value}%` :
             hoveredMetric.label === 'Avg Win' ? `+${hoveredMetric.value}%` :
             hoveredMetric.label === 'Avg Loss' ? `-${hoveredMetric.value}%` :
             hoveredMetric.label === 'Trades/yr' ? hoveredMetric.value.toFixed(1) :
             hoveredMetric.value.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
