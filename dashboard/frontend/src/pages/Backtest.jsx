import React, { useState, useEffect } from 'react'
import { runBacktest, getBacktestResult, getBacktestHistory } from '../api'
import { T, pnlColor } from '../theme'
import MetricCard from '../components/MetricCard'
import EquityChart from '../components/EquityChart'
import TerminalTable from '../components/TerminalTable'

const inputStyle = {
  width: '100%', padding: '7px 10px', background: T.bgBase, border: `1px solid ${T.bgLine}`,
  color: T.textPrimary, fontSize: 12, outline: 'none',
}

export default function Backtest() {
  const [params, setParams] = useState({
    start_date: '2022-01-01', end_date: '2026-03-24', use_ml: true,
    buy_threshold: 0.52, initial_capital: 1000000, max_positions: 20,
  })
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => { getBacktestHistory().then(setHistory).catch(() => {}) }, [])

  const addLog = (msg) => setLogs(prev => [...prev, `> ${msg}`])

  const handleRun = async () => {
    setRunning(true); setElapsed(0); setResult(null); setLogs([])
    addLog('Initializing backtest engine...')
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)

    try {
      addLog(`Running ${params.start_date} → ${params.end_date}`)
      addLog(`ML filter: ${params.use_ml ? 'ON' : 'OFF'} | Threshold: ${params.buy_threshold}`)
      const { job_id } = await runBacktest(params)
      addLog(`Job ${job_id} submitted. Processing...`)

      const poll = async () => {
        const res = await getBacktestResult(job_id)
        if (res.status === 'complete') {
          setResult(res.result); setRunning(false); clearInterval(timer)
          addLog('Complete. Generating report...')
        } else if (res.status === 'error') {
          addLog(`ERROR: ${res.error}`); setRunning(false); clearInterval(timer)
        } else setTimeout(poll, 2000)
      }
      poll()
    } catch (e) { addLog(`FAILED: ${e.message}`); setRunning(false); clearInterval(timer) }
  }

  const r = result

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 1 }}>
      {/* Left: params */}
      <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16 }}>
        <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1.5, marginBottom: 14, textTransform: 'uppercase' }}>Parameters</div>
        {[['Start Date', 'start_date', 'date'], ['End Date', 'end_date', 'date'], ['Capital', 'initial_capital', 'number']].map(([l, k, t]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{l}</div>
            <input type={t} value={params[k]} onChange={e => setParams({ ...params, [k]: t === 'number' ? +e.target.value : e.target.value })} style={inputStyle} />
          </div>
        ))}
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={params.use_ml} onChange={e => setParams({ ...params, use_ml: e.target.checked })} />
          <span style={{ fontSize: 11, color: T.textPrimary }}>ML FILTER</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 1, marginBottom: 4 }}>THRESHOLD: {params.buy_threshold}</div>
          <input type="range" min="0.50" max="0.70" step="0.01" value={params.buy_threshold}
            onChange={e => setParams({ ...params, buy_threshold: +e.target.value })}
            style={{ width: '100%', accentColor: T.amber }} />
        </div>
        <button onClick={handleRun} disabled={running} style={{
          width: '100%', padding: '8px 0', background: 'transparent', border: `1px solid ${running ? T.textDim : T.amber}`,
          color: running ? T.textDim : T.amber, fontSize: 11, letterSpacing: 2, cursor: running ? 'wait' : 'pointer',
          textTransform: 'uppercase',
        }}>
          {running ? `RUNNING... ${elapsed}s` : 'RUN BACKTEST'}
        </button>
      </div>

      {/* Right: results */}
      <div>
        {running && (
          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16, marginBottom: 1, fontFamily: T.font }}>
            {logs.map((l, i) => <div key={i} style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.8 }}>{l}</div>)}
            <span style={{ color: T.amber, animation: 'blink 1s infinite' }}>_</span>
          </div>
        )}

        {r && (
          <>
            <div style={{ display: 'flex', border: `1px solid ${T.bgLine}`, marginBottom: 1 }}>
              <MetricCard label="Return" value={`${r.total_return_pct >= 0 ? '+' : ''}${r.total_return_pct}%`} color={r.total_return_pct >= 0 ? 'pos' : 'neg'} />
              <MetricCard label="Sharpe" value={r.sharpe_ratio} color={r.sharpe_ratio > 0.5 ? 'pos' : 'neg'} />
              <MetricCard label="Max DD" value={`${r.max_drawdown_pct}%`} color="neg" />
              <MetricCard label="Win Rate" value={`${r.win_rate_pct}%`} color={r.win_rate_pct > 30 ? 'pos' : 'neg'} />
              <MetricCard label="PF" value={r.profit_factor} color={r.profit_factor > 1 ? 'pos' : 'neg'} />
              <MetricCard label="Alpha" value={`${r.alpha >= 0 ? '+' : ''}${r.alpha}%`} color={r.alpha >= 0 ? 'pos' : 'neg'} />
            </div>
            <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 16, marginBottom: 1 }}>
              <EquityChart data={r.equity_curve || []} />
            </div>
            <div style={{ display: 'flex', border: `1px solid ${T.bgLine}` }}>
              <MetricCard label="Trades" value={r.total_trades} />
              <MetricCard label="Avg Win" value={`+${r.avg_win_pct}%`} color="pos" />
              <MetricCard label="Avg Loss" value={`${r.avg_loss_pct}%`} color="neg" />
              <MetricCard label="Stops" value={r.stops_hit} />
              <MetricCard label="Reversals" value={r.ema_reversals} />
              <MetricCard label="Final" value={`Rs ${r.final_capital?.toLocaleString()}`} color="amb" />
            </div>
          </>
        )}

        {!running && !r && (
          <div style={{ background: T.bgPanel, border: `1px solid ${T.bgLine}`, padding: 60, textAlign: 'center', color: T.textDim, fontSize: 11, letterSpacing: 1 }}>
            CONFIGURE PARAMETERS AND RUN BACKTEST
          </div>
        )}

        {history.length > 0 && (
          <div style={{ border: `1px solid ${T.bgLine}`, marginTop: 16 }}>
            <div style={{ padding: '8px 12px', fontSize: 10, color: T.textDim, letterSpacing: 1.5, textTransform: 'uppercase', background: T.bgPanel }}>
              Version History
            </div>
            <TerminalTable columns={[
              { key: 'version_id', label: 'Version', render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
              { key: 'date', label: 'Date' },
              { key: 'total_return', label: 'Return', align: 'right', render: v => <span style={{ color: pnlColor(v) }}>{v}%</span> },
              { key: 'sharpe', label: 'Sharpe', align: 'right' },
              { key: 'max_dd', label: 'Max DD', align: 'right' },
              { key: 'win_rate', label: 'Win Rate', align: 'right' },
              { key: 'notes', label: 'Notes', style: () => ({ fontSize: 10, color: T.textDim }) },
            ]} rows={history} />
          </div>
        )}
      </div>
    </div>
  )
}
