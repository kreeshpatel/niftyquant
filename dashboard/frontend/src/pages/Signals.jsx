import React, { useEffect, useState } from 'react'
import { fetchWalkForward } from '../api'

export default function Signals() {
  const [folds, setFolds] = useState([])
  useEffect(() => { fetchWalkForward().then(d => setFolds(d.folds || [])) }, [])

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>Signal scanner</h1>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, padding: '5px 12px', borderRadius: 20,
          background: '#f8717115', color: 'var(--red)', border: '1px solid #f8717130',
        }}>BEAR</span>
      </div>

      {/* Designed empty state */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '80px 40px', textAlign: 'center',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', marginBottom: 32,
      }}>
        <div style={{
          fontSize: 64, fontWeight: 800, letterSpacing: 8,
          color: 'rgba(248,113,113,0.15)', fontFamily: 'var(--font-mono)',
          marginBottom: 24, lineHeight: 1,
        }}>BEAR</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Engine is in capital preservation mode
        </div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.6, maxWidth: 380,
        }}>
          Market breadth is at 9.2% — only 9 of 100 stocks are in uptrends.
          The engine blocks all new entries until conditions improve.
        </div>

        <div style={{
          marginTop: 32, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
          padding: '16px 20px', textAlign: 'left', width: '100%', maxWidth: 360,
        }}>
          <div style={{
            fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)',
            marginBottom: 12, fontFamily: 'var(--font-mono)',
          }}>WATCH FOR REGIME CHANGE</div>
          <div className="tabular" style={{
            fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.8, color: 'rgba(255,255,255,0.4)',
          }}>
            Breadth &gt; 55% · currently 9.2%<br />
            Nifty RSI &gt; 50 · currently 33.9<br />
            VIX &lt; 18 · currently 15.0<br />
            Nifty ADX &gt; 25 · currently 28.0
          </div>
        </div>
      </div>

      {folds.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
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
                      padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)',
                      borderBottom: '1px solid var(--border)', textAlign: h === 'Fold' || h === 'Period' ? 'left' : 'right',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {folds.map(f => (
                  <tr key={f.fold}>
                    <td style={cs}><span style={{ fontWeight: 700 }}>#{f.fold}</span></td>
                    <td style={cs}>{f.test_start} — {f.test_end}</td>
                    <td className="tabular" style={{ ...cs, textAlign: 'right', color: f.roc_auc > 0.52 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{f.roc_auc.toFixed(3)}</td>
                    <td className="tabular" style={{ ...cs, textAlign: 'right' }}>{f.n_signals.toLocaleString()}</td>
                    <td className="tabular" style={{ ...cs, textAlign: 'right' }}>{f.win_rate.toFixed(1)}%</td>
                    <td className="tabular" style={{ ...cs, textAlign: 'right', color: f.avg_return >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{f.avg_return >= 0 ? '+' : ''}{f.avg_return.toFixed(2)}%</td>
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

const cs = { padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, borderBottom: '1px solid #ffffff05' }
