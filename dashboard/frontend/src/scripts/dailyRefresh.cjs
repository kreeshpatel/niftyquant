/**
 * Daily Data Refresh Pipeline
 *
 * Run: node src/scripts/dailyRefresh.cjs
 * From: C:\project\dashboard\frontend
 *
 * Steps:
 * 1. python data_fetcher.py        — Download OHLCV from Yahoo Finance
 * 2. python src/feature_engineer.py — Compute technical indicators
 * 3. node buildStockData.cjs        — Rebuild stockData.json
 * 4. node runBacktest.cjs           — Update Pre-Move accuracy
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const FRONTEND_ROOT = path.resolve(__dirname, '../..')
const TIMESTAMP_FILE = path.resolve(FRONTEND_ROOT, 'src/data/lastRefresh.json')

function run(cmd, cwd, label) {
  console.log(`\n[${'='.repeat(60)}]`)
  console.log(`  STEP: ${label}`)
  console.log(`  CMD:  ${cmd}`)
  console.log(`  CWD:  ${cwd}`)
  console.log(`[${'='.repeat(60)}]\n`)

  try {
    execSync(cmd, { cwd, stdio: 'inherit', timeout: 600000 })
    console.log(`\n  [OK] ${label}\n`)
    return true
  } catch (e) {
    console.error(`\n  [FAIL] ${label}: ${e.message}\n`)
    return false
  }
}

function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('  NiftyQuant Daily Data Refresh')
  console.log('  ' + new Date().toISOString())
  console.log('='.repeat(60))

  const results = {}

  // Step 1: Download OHLCV
  results.fetch = run('python data_fetcher.py', PROJECT_ROOT, 'Fetch OHLCV from Yahoo Finance')

  // Step 2: Compute features
  results.features = run('python src/feature_engineer.py', PROJECT_ROOT, 'Compute technical indicators')

  // Step 3: Build stockData.json
  results.stockData = run('node src/scripts/buildStockData.cjs', FRONTEND_ROOT, 'Build stockData.json')

  // Step 4: Run Pre-Move backtest
  results.backtest = run('node src/scripts/runBacktest.cjs', FRONTEND_ROOT, 'Run Pre-Move backtest')

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const allOk = Object.values(results).every(Boolean)

  // Save timestamp
  const refreshData = {
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    elapsed: parseFloat(elapsed),
    success: allOk,
    steps: results,
  }
  fs.writeFileSync(TIMESTAMP_FILE, JSON.stringify(refreshData, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(`  REFRESH ${allOk ? 'COMPLETE' : 'PARTIAL'} in ${elapsed}s`)
  Object.entries(results).forEach(([k, v]) => console.log(`    ${k}: ${v ? 'OK' : 'FAILED'}`))
  console.log('='.repeat(60))

  process.exit(allOk ? 0 : 1)
}

main()
