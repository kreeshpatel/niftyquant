import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import PasswordGate from './auth/PasswordGate'
import Layout from './components/Layout'
import ShortcutsModal from './components/ShortcutsModal'
import Overview from './pages/Overview'
import Screener from './pages/Screener'
import Signals from './pages/Signals'
import Analytics from './pages/Analytics'
import Backtest from './pages/Backtest'
import TradeLog from './pages/TradeLog'

function AuthedApp() {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let gPressed = false
    let gTimeout = null
    const handler = (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

      if (e.key === '?') { setShowShortcuts(s => !s); return }
      if (e.key === 'Escape') { setShowShortcuts(false); return }
      if (e.key === '/') { e.preventDefault(); document.getElementById('stock-search')?.focus(); return }

      if (e.key === 'g' || e.key === 'G') {
        gPressed = true
        clearTimeout(gTimeout)
        gTimeout = setTimeout(() => { gPressed = false }, 1000)
        return
      }
      if (gPressed) {
        gPressed = false
        const routes = { o: '/', s: '/screener', n: '/signals', a: '/analytics', b: '/backtest', t: '/trades' }
        if (routes[e.key]) { navigate(routes[e.key]); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(gTimeout) }
  }, [navigate])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/trades" element={<TradeLog />} />
      </Routes>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </Layout>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('nq_auth') === 'true')
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />
  return <AuthedApp />
}
