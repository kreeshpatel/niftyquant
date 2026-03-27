import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import PasswordGate from './auth/PasswordGate'
import Layout from './components/Layout'
import { PortfolioProvider } from './context/PortfolioContext'

const Terminal = lazy(() => import('./pages/Terminal'))
const PreMove = lazy(() => import('./pages/PreMove'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const PnL = lazy(() => import('./pages/PnL'))
const Journal = lazy(() => import('./pages/Journal'))
const Backtest = lazy(() => import('./pages/Backtest'))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 200, height: 8, margin: '0 auto 12px', borderRadius: 4 }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>LOADING...</div>
      </div>
    </div>
  )
}

function AuthedApp() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let gPressed = false
    let gTimeout = null
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

      if (e.key === '/') { e.preventDefault(); document.getElementById('stock-search')?.focus(); return }

      if (e.key === 'g' || e.key === 'G') {
        gPressed = true
        clearTimeout(gTimeout)
        gTimeout = setTimeout(() => { gPressed = false }, 800)
        return
      }
      if (gPressed) {
        gPressed = false
        const routes = { t: '/', p: '/premove', f: '/portfolio', l: '/pnl', j: '/journal', b: '/backtest' }
        if (routes[e.key]) { navigate(routes[e.key]); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(gTimeout) }
  }, [navigate])

  return (
    <PortfolioProvider>
      <Layout>
        <div key={location.pathname} style={{ animation: 'pageEnter 0.25s ease both' }}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes location={location}>
              <Route path="/" element={<Terminal />} />
              <Route path="/premove" element={<PreMove />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/pnl" element={<PnL />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/backtest" element={<Backtest />} />
            </Routes>
          </Suspense>
        </div>
      </Layout>
    </PortfolioProvider>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('nq_auth') === 'true')
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />
  return <AuthedApp />
}
