/**
 * Pre-Move Historical Backtest Runner
 *
 * Run with: node src/scripts/runBacktest.cjs
 * From:     C:\project\dashboard\frontend
 *
 * Loads 365 stocks x 1237 days of OHLCV data, calculates indicators,
 * runs Pre-Move detection on every trading day, tracks forward returns.
 */

const { runFullHistoricalBacktest, analyzeSignalOverlap } = require('../utils/historicalBacktest.cjs')
const fs = require('fs')
const path = require('path')

async function main() {
  const start = Date.now()
  console.log('==========================================================')
  console.log('  NiftyQuant Pre-Move Historical Backtest')
  console.log('  Mode: Direction-free (volatility detection)')
  console.log('  Weights: VA:0.35 IF:0.30 SR:0.20 VS:0.10 MD:0.05')
  console.log('==========================================================\n')

  const { results, detections } = await runFullHistoricalBacktest({
    startDate: '2022-01-01',
    endDate: '2026-03-24',
    targetMove: 3.39,
    maxHoldDays: 5,
    dataDir: path.resolve(__dirname, '../../../../data'),
  })

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nBacktest completed in ${elapsed}s\n`)

  console.log('OVERALL RESULTS')
  console.log('─────────────────────────────────────────')
  console.log(`Period:           ${results.startDate} to ${results.endDate}`)
  console.log(`Trading days:     ${results.tradingDays}`)
  console.log(`Stocks analyzed:  ${results.stockCount}`)
  console.log(`Total detections: ${results.totalDetections}`)
  console.log(`Correct:          ${results.correctPredictions}`)
  console.log(`Accuracy:         ${results.accuracy}%`)
  console.log(`Avg max move:     ${results.avgMove}%`)
  console.log(`Avg time to move: ${results.avgTimeToMove}d`)
  console.log(`Target threshold: ${results.targetMove}%`)
  console.log()

  console.log('BY STRENGTH')
  console.log('─────────────────────────────────────────')
  for (const [tier, data] of Object.entries(results.byStrength)) {
    const bar = '#'.repeat(Math.round(data.accuracy / 2))
    console.log(`  ${tier.padEnd(10)} ${String(data.accuracy).padStart(5)}% (n=${String(data.total).padStart(6)}) avg move: ${data.avgMove}%  ${bar}`)
  }
  console.log()

  console.log('SIGNAL QUALITY')
  console.log('─────────────────────────────────────────')
  console.log(`  High conviction (S+M): ${results.signalQuality.highConviction.accuracy}% (n=${results.signalQuality.highConviction.total})`)
  console.log(`  Low conviction (W):    ${results.signalQuality.lowConviction.accuracy}% (n=${results.signalQuality.lowConviction.total})`)
  console.log(`  Edge:                  ${results.signalQuality.edge > 0 ? '+' : ''}${results.signalQuality.edge}%`)
  console.log()

  console.log('BY YEAR')
  console.log('─────────────────────────────────────────')
  for (const [year, data] of Object.entries(results.byYear).sort()) {
    const bar = '#'.repeat(Math.round(data.accuracy / 2))
    console.log(`  ${year}  ${String(data.accuracy).padStart(5)}% (n=${String(data.total).padStart(6)})  ${bar}`)
  }
  console.log()

  console.log('BY SECTOR (top 10)')
  console.log('─────────────────────────────────────────')
  const sectorsSorted = Object.entries(results.bySector).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
  for (const [sector, data] of sectorsSorted) {
    console.log(`  ${sector.padEnd(16)} ${String(data.accuracy).padStart(5)}% (n=${String(data.total).padStart(5)})`)
  }
  console.log()

  // Signal overlap analysis
  console.log('SIGNAL OVERLAP WITH EXISTING TRADES')
  console.log('─────────────────────────────────────────')
  const tradeLogPath = path.resolve(__dirname, '../../../../results/trade_log.csv')
  const overlap = analyzeSignalOverlap(detections, tradeLogPath)
  if (overlap) {
    console.log(`  Total backtester trades: ${overlap.totalTrades}`)
    console.log(`  With Pre-Move signal:    ${overlap.tradesWithSignal.count} trades, ${overlap.tradesWithSignal.winRate}% win rate, avg ${overlap.tradesWithSignal.avgReturn}% return`)
    console.log(`  Without Pre-Move signal: ${overlap.tradesWithoutSignal.count} trades, ${overlap.tradesWithoutSignal.winRate}% win rate, avg ${overlap.tradesWithoutSignal.avgReturn}% return`)
    console.log(`  Signal lift:             ${overlap.signalLift > 0 ? '+' : ''}${overlap.signalLift}%`)
    results.signalOverlap = overlap
  }
  console.log()

  // Save results
  const outPath = path.resolve(__dirname, '../../../../results/premove_backtest_results.json')
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`Results saved to: ${outPath}`)

  // Also save to frontend src/data dir for UI import
  const uiPath = path.resolve(__dirname, '../data/premove_backtest_results.json')
  fs.writeFileSync(uiPath, JSON.stringify(results, null, 2))
  console.log(`UI data saved to: ${uiPath}`)

  console.log('\nDone.')
}

main().catch(e => {
  console.error('Backtest failed:', e)
  process.exit(1)
})
