import React, { useEffect, useState } from 'react'
import { fetchWalkForward } from '../api'
import SignalCard from '../components/SignalCard'

export default function Signals() {
  const [folds, setFolds] = useState([])
  useEffect(() => { fetchWalkForward().then(d => setFolds(d.folds || [])) }, [])

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--text-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>Signal scanner</h1>
        <span style={{
          fontFamily: 'var(--text-mono)', fontSize: 10, padding: '5px 12px', borderRadius: 20,
          background: '#f8717115', color: 'var(--red)', border: '1px solid #f8717130',
        }}>BEAR</span>
        <span style={{ fontFamily: 'var(--text-mono)', fontSize: 11, color: 'var(--text-dim)' }}>0 candidates</span>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 60, textAlign: 'center', marginBottom: 32,
      }}>
        <div style={{ fontFamily: 'var(--text-display)', fontSize: 20, color: 'var(--text-dim)', marginBottom: 8 }}>
          0 signals today
        </div>
        <div style={{ fontFamily: 'var(--text-mono)', fontSize: 13, color: 'var(--text-dim)' }}>
          Market in BEAR regime · engine holding cash
        </div>
      </div>

      {folds.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--text-mono)', fontSize: 10, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: 1.5, margin: '24px 0 12px',
          }}>Walk-forward folds · model validation</div>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fold', 'Period', 'AUC', 'Signals', 'Win Rate', 'Avg Return'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', fontFamily: 'var(--text-mono)', fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)',
                      borderBottom: '1px solid var(--border)', textAlign: h === 'Fold' || h === 'Period' ? 'left' : 'right',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {folds.map(f => (
                  <tr key={f.fold}>
                    <td style={cellStyle}><span style={{ fontWeight: 700 }}>#{f.fold}</span></td>
                    <td style={cellStyle}>{f.test_start} — {f.test_end}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: f.roc_auc > 0.52 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{f.roc_auc.toFixed(3)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{f.n_signals.toLocaleString()}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{f.win_rate.toFixed(1)}%</td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: f.avg_return >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{f.avg_return >= 0 ? '+' : ''}{f.avg_return.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const cellStyle = { padding: '12px 14px', fontFamily: 'var(--text-mono)', fontSize: 12, borderBottom: '1px solid #ffffff05' }
