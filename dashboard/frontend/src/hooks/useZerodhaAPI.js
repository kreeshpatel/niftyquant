import { useState, useCallback } from 'react'
import * as zerodha from '../utils/zerodhaApi'

export function useZerodhaAPI() {
  const [connected, setConnected] = useState(zerodha.isConnected())
  const [loading, setLoading] = useState(false)

  const connect = useCallback(() => {
    window.location.href = zerodha.getLoginURL()
  }, [])

  const handleCallback = useCallback(async (requestToken) => {
    setLoading(true)
    try {
      await zerodha.exchangeToken(requestToken)
      setConnected(true)
      return true
    } catch (err) {
      console.error('Zerodha auth failed:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    zerodha.clearTokens()
    setConnected(false)
  }, [])

  return { connected, loading, connect, disconnect, handleCallback }
}
