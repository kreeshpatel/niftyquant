import React from 'react'
import { useRelativeTime } from '../hooks/useRelativeTime'

export default function Timestamp({ value, prefix = '' }) {
  const relative = useRelativeTime(value)
  const exact = value
    ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST'
    : '--'

  return (
    <span title={exact} style={{ cursor: 'default', borderBottom: '1px dotted rgba(255,255,255,0.15)' }}>
      {prefix}{relative}
    </span>
  )
}
