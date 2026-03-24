import React, { useState } from 'react'
import { T } from '../theme'

export default function TerminalTable({ columns, rows, onRowClick }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = sortKey ? [...rows].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey]
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortAsc ? cmp : -cmp
  }) : rows

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} onClick={() => handleSort(col.key)} style={{
              padding: '8px 10px', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              color: T.textDim, textAlign: col.align || 'left', cursor: 'pointer',
              borderBottom: `1px solid ${T.bgLine}`, background: T.bgPanel, userSelect: 'none',
            }}>
              {col.label} {sortKey === col.key ? (sortAsc ? '▲' : '▼') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={i} onClick={() => onRowClick?.(row)} style={{
            background: i % 2 === 0 ? T.bgPanel : '#0d0d0d', cursor: onRowClick ? 'pointer' : 'default',
          }}>
            {columns.map(col => (
              <td key={col.key} style={{
                padding: '7px 10px', fontSize: 12, color: T.textPrimary,
                textAlign: col.align || 'left', borderBottom: `1px solid ${T.bgLine}`,
                ...(col.style?.(row) || {}),
              }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
        {sorted.length === 0 && (
          <tr><td colSpan={columns.length} style={{
            padding: 30, textAlign: 'center', color: T.textDim, fontSize: 11,
          }}>NO DATA</td></tr>
        )}
      </tbody>
    </table>
  )
}
