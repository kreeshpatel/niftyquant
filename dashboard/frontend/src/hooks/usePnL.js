import { useMemo } from 'react'
import { usePortfolioContext } from '../context/PortfolioContext'
import { pnlByPeriod, pnlBySector, pnlByDayOfWeek, monthlyReturnsGrid, buildEquityCurve } from '../utils/pnlCalculations'
import { calculateDrawdown, calculateSharpe, calculateSortino, calculateProfitFactor, calculateWinRate, calculateConsecutiveStreaks } from '../utils/riskCalculations'

export function usePnL() {
  const { trades, settings } = usePortfolioContext()

  const closedTrades = useMemo(() => trades.filter(t => t.exit_date && t.exit_price), [trades])

  const periods = useMemo(() => pnlByPeriod(closedTrades), [closedTrades])
  const bySector = useMemo(() => pnlBySector(closedTrades), [closedTrades])
  const byDay = useMemo(() => pnlByDayOfWeek(closedTrades), [closedTrades])
  const monthlyGrid = useMemo(() => monthlyReturnsGrid(closedTrades), [closedTrades])
  const equityCurve = useMemo(() => buildEquityCurve(closedTrades, settings.initialCapital), [closedTrades, settings.initialCapital])

  const riskMetrics = useMemo(() => {
    if (!equityCurve.length) return null
    const values = equityCurve.map(e => e.value)
    const returns = []
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1])
    }
    const dd = calculateDrawdown(values)
    const streaks = calculateConsecutiveStreaks(closedTrades)

    return {
      sharpe: calculateSharpe(returns),
      sortino: calculateSortino(returns),
      maxDrawdown: dd.maxDrawdown,
      currentDrawdown: dd.currentDrawdown,
      drawdowns: dd.drawdowns,
      profitFactor: calculateProfitFactor(closedTrades),
      winRate: calculateWinRate(closedTrades),
      ...streaks,
      totalTrades: closedTrades.length,
      avgWin: closedTrades.filter(t => t.pnl > 0).length > 0
        ? closedTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / closedTrades.filter(t => t.pnl > 0).length : 0,
      avgLoss: closedTrades.filter(t => t.pnl <= 0).length > 0
        ? closedTrades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) / closedTrades.filter(t => t.pnl <= 0).length : 0,
      largestWin: closedTrades.length ? Math.max(...closedTrades.map(t => t.pnl)) : 0,
      largestLoss: closedTrades.length ? Math.min(...closedTrades.map(t => t.pnl)) : 0,
      avgHoldDays: closedTrades.length > 0
        ? closedTrades.reduce((s, t) => {
            const days = t.exit_date && t.entry_date
              ? Math.ceil((new Date(t.exit_date) - new Date(t.entry_date)) / 86400000) : 0
            return s + days
          }, 0) / closedTrades.length : 0,
    }
  }, [equityCurve, closedTrades])

  return { periods, bySector, byDay, monthlyGrid, equityCurve, riskMetrics, closedTrades }
}
