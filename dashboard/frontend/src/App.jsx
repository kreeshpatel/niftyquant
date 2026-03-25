import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { globalCSS } from './theme'
import PasswordGate from './auth/PasswordGate'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Features from './pages/Features'
import WalkForward from './pages/WalkForward'
import TradeLog from './pages/TradeLog'

export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('nq_auth') === 'true')

  if (!authed) return (
    <><style>{globalCSS}</style><PasswordGate onAuth={() => setAuthed(true)} /></>
  )

  return (
    <>
      <style>{globalCSS}</style>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/features" element={<Features />} />
          <Route path="/walk-forward" element={<WalkForward />} />
          <Route path="/trades" element={<TradeLog />} />
        </Routes>
      </Layout>
    </>
  )
}
