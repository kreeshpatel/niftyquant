import { useState, useEffect, useCallback } from 'react'

export function useRelativeTime(timestamp) {
  const compute = useCallback(() => {
    if (!timestamp) return 'Never'
    const diffMs = Date.now() - new Date(timestamp).getTime()
    const sec = Math.floor(diffMs / 1000)
    const min = Math.floor(sec / 60)
    const hr = Math.floor(min / 60)
    const day = Math.floor(hr / 24)
    if (sec < 30) return 'Just now'
    if (sec < 60) return `${sec}s ago`
    if (min < 60) return `${min}m ago`
    if (hr < 24) return `${hr}h ago`
    if (day === 1) return 'Yesterday'
    if (day < 7) return `${day}d ago`
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }, [timestamp])

  const [relative, setRelative] = useState(compute)
  useEffect(() => {
    setRelative(compute())
    const id = setInterval(() => setRelative(compute()), 30000)
    return () => clearInterval(id)
  }, [compute])

  return relative
}
