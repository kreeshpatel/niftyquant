export const T = {
  bgBase: '#0a0a0a',
  bgPanel: '#0f0f0f',
  bgElevated: '#111111',
  bgLine: '#1e1e1e',
  bgSubtle: '#161616',
  textPrimary: '#c8c8b4',
  textMuted: '#666666',
  textDim: '#444444',
  textAccent: '#f59e0b',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#378ADD',
  dimGreen: '#1a2e1a',
  dimRed: '#2e1a1a',
  dimAmber: '#2e2410',
  font: "'JetBrains Mono', 'Fira Mono', 'Courier New', monospace",
}

export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${T.bgBase}; color: ${T.textPrimary}; font-family: ${T.font}; font-size: 12px; }
  a { color: inherit; text-decoration: none; }
  ::selection { background: ${T.amber}; color: ${T.bgBase}; }
  input, select, button { font-family: ${T.font}; }
  @keyframes flash { 0%,100%{color:inherit} 50%{color:${T.amber}} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .flash { animation: flash 0.3s ease; }
`

export function pnlColor(v) { return v >= 0 ? T.green : T.red }
export function regimeColor(r) {
  if (r === 'BULL') return T.green
  if (r === 'BEAR') return T.red
  return T.amber
}
