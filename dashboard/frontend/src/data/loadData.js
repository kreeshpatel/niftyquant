import portfolioHistory from '../../results/portfolio_history.csv?raw'
import tradeLog from '../../results/trade_log.csv?raw'
import featureImportance from '../../results/feature_importance.csv?raw'
import walkForward from '../../results/walk_forward.csv?raw'

function parseCSV(raw) {
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim()]))
  })
}

export const portfolioData = parseCSV(portfolioHistory)
export const tradeData = parseCSV(tradeLog)
export const featureData = parseCSV(featureImportance)
export const walkForwardData = parseCSV(walkForward)
