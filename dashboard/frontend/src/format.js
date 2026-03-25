/** Format number in Indian style: ₹10,83,030 */
export function fmtINR(v) {
  if (v == null || isNaN(v)) return '—'
  const n = Number(v)
  const abs = Math.abs(n)
  // Indian grouping: last 3 digits, then groups of 2
  const [intPart, decPart] = abs.toFixed(0).split('.')
  let formatted
  if (intPart.length <= 3) {
    formatted = intPart
  } else {
    const last3 = intPart.slice(-3)
    let rest = intPart.slice(0, -3)
    const groups = []
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2))
      rest = rest.slice(0, -2)
    }
    if (rest) groups.unshift(rest)
    formatted = groups.join(',') + ',' + last3
  }
  return (n < 0 ? '-' : '') + '\u20B9' + formatted
}

/** Format as compact lakhs: ₹10.83L */
export function fmtLakhs(v) {
  if (v == null || isNaN(v)) return '—'
  const n = Number(v)
  const lakhs = n / 100000
  return '\u20B9' + lakhs.toFixed(2) + 'L'
}

/** Win rate color: >40% green, 20-40% amber, <20% red */
export function winRateColor(wr, T) {
  if (wr > 40) return T.green
  if (wr >= 20) return T.amber
  return T.red
}
