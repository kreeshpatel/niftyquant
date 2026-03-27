import { useState, useEffect, useCallback } from 'react'
import { detectPreMoves, getHistoricalAccuracy } from '../utils/preMove'

export function usePreMoveDetection() {
  const [detections, setDetections] = useState([])
  const [accuracy] = useState(() => getHistoricalAccuracy())
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  const scan = useCallback(() => {
    setScanning(true)
    const results = detectPreMoves()
    setDetections(results)
    setLastScan(new Date())
    setScanning(false)
  }, [])

  useEffect(() => { scan() }, [scan])

  const strongSignals = detections.filter(d => d.strength === 'STRONG')
  const moderateSignals = detections.filter(d => d.strength === 'MODERATE')
  const weakSignals = detections.filter(d => d.strength === 'WEAK')

  return {
    detections, accuracy, scanning, lastScan,
    backtesting: false,
    strongSignals, moderateSignals, weakSignals,
    scan,
  }
}
