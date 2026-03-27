import { useState, useEffect, useCallback } from 'react'
import { detectPreMoves, getHistoricalAccuracy } from '../utils/preMove'

export function usePreMoveDetection() {
  const [detections, setDetections] = useState([])
  const [accuracy, setAccuracy] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  const scan = useCallback(() => {
    setScanning(true)
    // Simulate scanning delay for UX
    setTimeout(() => {
      const results = detectPreMoves()
      setDetections(results)
      setAccuracy(getHistoricalAccuracy())
      setLastScan(new Date())
      setScanning(false)
    }, 800)
  }, [])

  useEffect(() => { scan() }, [scan])

  const strongSignals = detections.filter(d => d.strength === 'STRONG')
  const moderateSignals = detections.filter(d => d.strength === 'MODERATE')
  const weakSignals = detections.filter(d => d.strength === 'WEAK')

  return {
    detections, accuracy, scanning, lastScan,
    strongSignals, moderateSignals, weakSignals,
    scan,
  }
}
