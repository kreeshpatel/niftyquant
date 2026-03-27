import { useState, useEffect, useCallback } from 'react'
import { fetchIndices, fetchMarketBreadth, fetchSectorPerformance, getMarketStatus } from '../utils/nseApi'

export function useNSEData(refreshInterval = 60000) {
  const [indices, setIndices] = useState([])
  const [breadth, setBreadth] = useState({ advances: 0, declines: 0, unchanged: 0 })
  const [sectors, setSectors] = useState([])
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [idx, br, sec] = await Promise.all([
        fetchIndices(),
        fetchMarketBreadth(),
        fetchSectorPerformance(),
      ])
      setIndices(idx)
      setBreadth(br)
      setSectors(sec)
      setMarketStatus(getMarketStatus())
    } catch (err) {
      console.error('NSE data fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  return { indices, breadth, sectors, marketStatus, loading, refresh }
}
