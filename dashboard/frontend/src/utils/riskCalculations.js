/**
 * Risk calculation utilities
 * Drawdown, Sharpe, Sortino, Calmar, VaR, Beta, etc.
 */

export function calculateDrawdown(equityCurve) {
  if (!equityCurve.length) return { maxDrawdown: 0, currentDrawdown: 0, drawdowns: [] }

  let peak = equityCurve[0]
  let maxDrawdown = 0
  const drawdowns = equityCurve.map(value => {
    if (value > peak) peak = value
    const dd = peak > 0 ? (peak - value) / peak : 0
    if (dd > maxDrawdown) maxDrawdown = dd
    return -dd * 100
  })

  const currentDD = drawdowns[drawdowns.length - 1]
  return { maxDrawdown: maxDrawdown * 100, currentDrawdown: Math.abs(currentDD), drawdowns }
}

export function calculateSharpe(returns, riskFreeRate = 0.065) {
  if (!returns.length) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length
  const std = Math.sqrt(variance)
  if (std === 0) return 0
  const annualizedReturn = mean * 252
  const annualizedStd = std * Math.sqrt(252)
  return Math.round(((annualizedReturn - riskFreeRate) / annualizedStd) * 100) / 100
}

export function calculateSortino(returns, riskFreeRate = 0.065) {
  if (!returns.length) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const downside = returns.filter(r => r < 0)
  if (!downside.length) return mean > 0 ? 99 : 0
  const downsideVariance = downside.reduce((s, r) => s + r ** 2, 0) / downside.length
  const downsideStd = Math.sqrt(downsideVariance)
  if (downsideStd === 0) return 0
  const annualizedReturn = mean * 252
  const annualizedDownside = downsideStd * Math.sqrt(252)
  return Math.round(((annualizedReturn - riskFreeRate) / annualizedDownside) * 100) / 100
}

export function calculateCalmar(annualizedReturn, maxDrawdown) {
  if (maxDrawdown === 0) return 0
  return Math.round((annualizedReturn / maxDrawdown) * 100) / 100
}

export function calculateVaR(returns, confidence = 0.95) {
  if (!returns.length) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  const idx = Math.floor((1 - confidence) * sorted.length)
  return Math.round(sorted[idx] * 10000) / 100 // as percentage
}

export function calculateBeta(portfolioReturns, benchmarkReturns) {
  if (!portfolioReturns.length || portfolioReturns.length !== benchmarkReturns.length) return 1

  const n = portfolioReturns.length
  const meanP = portfolioReturns.reduce((a, b) => a + b, 0) / n
  const meanB = benchmarkReturns.reduce((a, b) => a + b, 0) / n

  let covariance = 0
  let benchmarkVariance = 0
  for (let i = 0; i < n; i++) {
    covariance += (portfolioReturns[i] - meanP) * (benchmarkReturns[i] - meanB)
    benchmarkVariance += (benchmarkReturns[i] - meanB) ** 2
  }
  covariance /= n
  benchmarkVariance /= n

  if (benchmarkVariance === 0) return 1
  return Math.round((covariance / benchmarkVariance) * 100) / 100
}

export function calculateProfitFactor(trades) {
  const wins = trades.filter(t => t.pnl > 0).reduce((a, t) => a + t.pnl, 0)
  const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, t) => a + t.pnl, 0))
  if (losses === 0) return wins > 0 ? Infinity : 0
  return Math.round((wins / losses) * 100) / 100
}

export function calculateWinRate(trades) {
  if (!trades.length) return 0
  const wins = trades.filter(t => t.pnl > 0).length
  return Math.round((wins / trades.length) * 1000) / 10
}

export function calculateExpectancy(trades) {
  if (!trades.length) return 0
  const winRate = calculateWinRate(trades) / 100
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  return Math.round((winRate * avgWin - (1 - winRate) * avgLoss) * 100) / 100
}

export function calculateConsecutiveStreaks(trades) {
  let curStreak = 0, curType = '', maxWin = 0, maxLoss = 0
  trades.forEach(t => {
    const isWin = t.pnl > 0
    if ((isWin && curType === 'win') || (!isWin && curType === 'loss')) {
      curStreak++
    } else {
      curStreak = 1
      curType = isWin ? 'win' : 'loss'
    }
    if (curType === 'win' && curStreak > maxWin) maxWin = curStreak
    if (curType === 'loss' && curStreak > maxLoss) maxLoss = curStreak
  })
  return { maxWinStreak: maxWin, maxLossStreak: maxLoss, currentStreak: curStreak, currentType: curType }
}
