import React from 'react'

function StatRow({ label, data, color, minSample }) {
  const insufficient = data && !data.reliable
  return (
    <div style={{ marginBottom: 6, opacity: insufficient ? 0.45 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color, fontWeight: 600 }}>
          {label}
          {data && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({data.total})</span>}
          {insufficient && <span style={{ color: 'var(--amber)', fontWeight: 400, marginLeft: 4 }}>n&lt;{minSample}</span>}
        </span>
        <span style={{ color: insufficient ? 'var(--text-muted)' : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {insufficient ? '--' : `${data.accuracy}%`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: insufficient ? '0%' : `${Math.min(100, data.accuracy)}%`,
          borderRadius: 2, background: insufficient ? 'var(--text-muted)' : color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

export default function HistoricalAccuracy({ accuracy, backtesting }) {
  if (backtesting) {
    return (
      <div className="widget">
        <div className="widget-header">
          <span>Historical Accuracy</span>
          <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 400 }}>Computing...</span>
        </div>
        <div className="widget-body" style={{ padding: 32, textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 80, height: 24, margin: '0 auto 8px', borderRadius: 4 }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Backtesting 363 stocks x 30 days...</div>
        </div>
      </div>
    )
  }

  if (!accuracy) return null
  const hasData = accuracy.totalDetections > 0
  const sq = accuracy.signalQuality
  const min = accuracy.minSampleSize || 30

  return (
    <div className="widget">
      <div className="widget-header">
        <span>Historical Accuracy</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
          Volatility Backtest
        </span>
      </div>
      <div className="widget-body">
        {!hasData ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No detections generated from sparkline data.
          </div>
        ) : (
          <>
            {/* Top-line stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: accuracy.accuracy >= 55 ? 'var(--green)' : accuracy.accuracy >= 45 ? 'var(--amber)' : 'var(--red)' }}>
                  {accuracy.accuracy}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OVERALL</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{accuracy.avgMoveSize}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AVG MOVE</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{accuracy.avgTimeToMove}d</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AVG TIME</div>
              </div>
            </div>

            {/* Signal quality edge — the key metric */}
            {sq && (
              <div style={{
                marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--r-sm)',
                background: sq.edge > 0 ? 'var(--green-d)' : 'var(--red-d)',
                border: `1px solid ${sq.edge > 0 ? 'var(--green-b)' : 'var(--red-b)'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
                  SIGNAL QUALITY EDGE
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Strong+Moderate ({sq.highConviction.total})
                  </span>
                  <span style={{ color: 'var(--green)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {sq.highConviction.accuracy}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Weak ({sq.lowConviction.total})
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {sq.lowConviction.accuracy}%
                  </span>
                </div>
                <div style={{
                  marginTop: 6, fontSize: 13, fontWeight: 700, textAlign: 'center',
                  color: sq.edge > 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {sq.edge > 0 ? '+' : ''}{sq.edge}% edge
                  {sq.edge > 10 && ' — strength strongly predicts accuracy'}
                  {sq.edge > 3 && sq.edge <= 10 && ' — strength predicts accuracy'}
                  {sq.edge > 0 && sq.edge <= 3 && ' — marginal edge'}
                  {sq.edge <= 0 && ' — no predictive value'}
                </div>
              </div>
            )}

            {/* By strength tier */}
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
              ACCURACY BY STRENGTH
            </div>
            <StatRow label="STRONG" data={accuracy.byStrength?.STRONG} color="var(--green)" minSample={min} />
            <StatRow label="MODERATE" data={accuracy.byStrength?.MODERATE} color="var(--amber)" minSample={min} />
            <StatRow label="WEAK" data={accuracy.byStrength?.WEAK} color="var(--text-tertiary)" minSample={min} />

            {/* Signal overlap with existing trades */}
            {accuracy.signalOverlap && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
                  OVERLAP WITH BACKTESTER TRADES
                </div>
                <div style={{
                  padding: '8px 10px', borderRadius: 4,
                  background: accuracy.signalOverlap.signalLift > 0 ? 'var(--green-d)' : 'var(--bg-elevated)',
                  border: `1px solid ${accuracy.signalOverlap.signalLift > 0 ? 'var(--green-b)' : 'var(--border-widget)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>With Pre-Move ({accuracy.signalOverlap.tradesWithSignal.count})</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>{accuracy.signalOverlap.tradesWithSignal.winRate}% WR</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Without ({accuracy.signalOverlap.tradesWithoutSignal.count})</span>
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 700 }}>{accuracy.signalOverlap.tradesWithoutSignal.winRate}% WR</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: accuracy.signalOverlap.signalLift > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {accuracy.signalOverlap.signalLift > 0 ? '+' : ''}{accuracy.signalOverlap.signalLift}% win rate lift
                  </div>
                </div>
              </div>
            )}

            {/* Methodology note */}
            <div style={{
              marginTop: 12, padding: '8px 10px', borderRadius: 4,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-widget)',
              fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5,
            }}>
              {accuracy.dataSource === 'historical_ohlcv' ? (
                <>
                  Real OHLCV backtest: {accuracy.period}.
                  {' '}{accuracy.tradingDays} trading days, {accuracy.stocksAnalyzed} stocks,
                  {' '}{accuracy.totalDetections.toLocaleString()} signals with computed indicators (RSI, ADX, MACD, BB, VR).
                  Correct = {accuracy.moveThreshold}%+ move in <strong style={{ color: 'var(--text-secondary)' }}>any direction</strong> within 5d.
                  {' '}n&lt;{min} greyed out.
                </>
              ) : (
                <>
                  Accuracy = stock moved {accuracy.moveThreshold}%+ in any direction within 5 days.
                  {' '}{accuracy.totalDetections} signals evaluated. n&lt;{min} greyed out.
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
