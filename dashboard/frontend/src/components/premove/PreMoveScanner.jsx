import React from 'react'

export default function PreMoveScanner({ scanning, lastScan, onScan, totalDetections }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-widget)',
      border: '1px solid var(--border-widget)',
      borderRadius: 'var(--r-md)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: scanning ? 'var(--amber)' : 'var(--green)',
          animation: scanning ? 'pulse 0.6s infinite' : 'none',
        }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            {scanning ? 'Scanning 360+ stocks...' : `${totalDetections} pre-move signals detected`}
          </div>
          {lastScan && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Last scan: {lastScan.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </div>
          )}
        </div>
      </div>

      <button onClick={onScan} disabled={scanning} className="btn" style={{
        background: scanning ? 'var(--bg-elevated)' : 'var(--green-d)',
        borderColor: scanning ? 'var(--border-widget)' : 'var(--green-b)',
        color: scanning ? 'var(--text-muted)' : 'var(--green)',
      }}>
        {scanning ? 'SCANNING...' : 'RE-SCAN'}
      </button>

      {scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
          backgroundSize: '200% 100%',
          animation: 'scan 1.5s linear infinite',
        }} />
      )}
    </div>
  )
}
