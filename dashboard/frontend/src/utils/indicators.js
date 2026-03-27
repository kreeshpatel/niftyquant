/**
 * Technical indicator calculations
 * For use with OHLCV data from Kite historical API
 */

export function sma(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const slice = data.slice(i - period + 1, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / period)
  }
  return result
}

export function ema(data, period) {
  const result = []
  const k = 2 / (period + 1)
  let prev = null
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { prev = data[i]; result.push(prev); continue }
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

export function rsi(closes, period = 14) {
  const result = []
  let avgGain = 0, avgLoss = 0

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(null); continue }
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (i <= period) {
      avgGain += gain / period
      avgLoss += loss / period
      if (i < period) { result.push(null); continue }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = emaFast.map((f, i) => (f !== null && emaSlow[i] !== null) ? f - emaSlow[i] : null)
  const validMacd = macdLine.filter(v => v !== null)
  const signalLine = ema(validMacd, signal)

  // Pad signal line
  const padded = Array(macdLine.length - signalLine.length).fill(null).concat(signalLine)
  const histogram = macdLine.map((m, i) => (m !== null && padded[i] !== null) ? m - padded[i] : null)

  return { macdLine, signalLine: padded, histogram }
}

export function bollingerBands(closes, period = 20, stdDevs = 2) {
  const middle = sma(closes, period)
  const upper = []
  const lower = []
  const pctB = []

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null); lower.push(null); pctB.push(null)
      continue
    }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = middle[i]
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period)
    upper.push(mean + stdDevs * std)
    lower.push(mean - stdDevs * std)
    const range = upper[i] - lower[i]
    pctB.push(range > 0 ? (closes[i] - lower[i]) / range : 0.5)
  }

  return { upper, middle, lower, pctB }
}

export function atr(highs, lows, closes, period = 14) {
  const trs = []
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) { trs.push(highs[i] - lows[i]); continue }
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }
  return ema(trs, period)
}

export function adx(highs, lows, closes, period = 14) {
  const result = []
  const plusDMs = [], minusDMs = [], trs = []

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      plusDMs.push(0); minusDMs.push(0); trs.push(highs[i] - lows[i])
      result.push(null)
      continue
    }

    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])))

    if (i < period) { result.push(null); continue }

    const smoothTR = trs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    const smoothPlusDM = plusDMs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    const smoothMinusDM = minusDMs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0
    const diSum = plusDI + minusDI
    const dx = diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0
    result.push(dx)
  }

  // Smooth ADX with EMA
  return ema(result.map(v => v ?? 0), period)
}

export function vwap(highs, lows, closes, volumes) {
  let cumVol = 0, cumTP = 0
  return closes.map((c, i) => {
    const tp = (highs[i] + lows[i] + c) / 3
    cumVol += volumes[i]
    cumTP += tp * volumes[i]
    return cumVol > 0 ? cumTP / cumVol : c
  })
}
