import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import PasswordGate from './auth/PasswordGate'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Positions from './pages/Positions'
import Signals from './pages/Signals'
import Backtest from './pages/Backtest'
import TradeLog from './pages/TradeLog'

export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('nq_auth') === 'true')

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/positions" element={<Positions />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/trades" element={<TradeLog />} />
      </Routes>
    </Layout>
  )
}
