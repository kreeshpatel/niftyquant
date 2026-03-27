/**
 * Build stockData.json from feature CSV files
 *
 * Reads data/features/*.NS.csv, extracts the latest row of indicators
 * plus a 30-day sparkline, outputs to src/data/stockData.json.
 *
 * Run: node src/scripts/buildStockData.cjs
 * From: C:\project\dashboard\frontend
 */

const fs = require('fs')
const path = require('path')

const FEATURES_DIR = path.resolve(__dirname, '../../../../data/features')
const OHLCV_DIR = path.resolve(__dirname, '../../../../data')
const OUTPUT = path.resolve(__dirname, '../data/stockData.json')
const SPARKLINE_DAYS = 30

function parseCSV(filepath) {
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row = {}
    headers.forEach((h, i) => row[h.trim()] = vals[i]?.trim() || '')
    return row
  })
}

function main() {
  console.log('Building stockData.json from feature CSVs...')
  console.log('Features dir:', FEATURES_DIR)

  const files = fs.readdirSync(FEATURES_DIR).filter(f => f.endsWith('.csv'))
  console.log(`Found ${files.length} feature CSVs`)

  const stockData = {}
  let processed = 0, skipped = 0

  for (const file of files) {
    const ticker = file.replace('.NS.csv', '')
    try {
      const rows = parseCSV(path.join(FEATURES_DIR, file))
      if (rows.length < 30) { skipped++; continue }

      // Get the latest valid row (skip rows with empty Close)
      let latest = null
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].Close && parseFloat(rows[i].Close) > 0) {
          latest = rows[i]
          break
        }
      }
      if (!latest) { skipped++; continue }

      const close = parseFloat(latest.Close) || 0
      const prevClose = rows.length >= 2 ? parseFloat(rows[rows.length - 2]?.Close) || close : close

      // Build sparkline from OHLCV (last 30 days of Close prices)
      const sparkline = []
      const startIdx = Math.max(0, rows.length - SPARKLINE_DAYS)
      for (let i = startIdx; i < rows.length; i++) {
        const r = rows[i]
        const c = parseFloat(r.Close)
        if (r.Date && c > 0) {
          sparkline.push([r.Date, c])
        }
      }

      stockData[ticker] = {
        close,
        dayChange: parseFloat(latest.return_1d) || (prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0),
        rsi: parseFloat(latest.rsi_14) || 50,
        adx: parseFloat(latest.adx_14) || 20,
        bbPct: parseFloat(latest.bb_pct) || 0.5,
        macdHist: parseFloat(latest.macd_histogram) || 0,
        ema9Above21: parseInt(latest.ema_9_above_21) || 0,
        volumeRatio: parseFloat(latest.volume_ratio) || 1,
        atrPct: parseFloat(latest.atr_pct) || 2,
        obvAboveEma: parseInt(latest.obv_above_ema) || 0,
        posIn52w: parseFloat(latest.position_in_52w) || 0.5,
        high52w: parseFloat(latest.high_52w) || close,
        low52w: parseFloat(latest.low_52w) || close,
        hybridSignal: parseInt(latest.hybrid_signal) || 0,
        inMomentum: parseInt(latest.in_momentum_regime) || 0,
        dipCount: parseInt(latest.dip_count) || 0,
        dipConviction: parseInt(latest.dip_conviction) || 0,
        atr14: parseFloat(latest.atr_14) || 0,
        date: latest.Date || '',
        sparkline,
      }
      processed++
    } catch (e) {
      console.log(`  SKIP ${ticker}: ${e.message}`)
      skipped++
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(stockData))
  const size = Math.round(fs.statSync(OUTPUT).size / 1024)

  console.log(`\nDone: ${processed} stocks processed, ${skipped} skipped`)
  console.log(`Output: ${OUTPUT} (${size} KB)`)

  // Verify a sample
  const sample = stockData['RELIANCE'] || stockData[Object.keys(stockData)[0]]
  if (sample) {
    const tk = stockData['RELIANCE'] ? 'RELIANCE' : Object.keys(stockData)[0]
    console.log(`\nSample (${tk}):`)
    console.log(`  close: ${sample.close}, date: ${sample.date}`)
    console.log(`  rsi: ${sample.rsi}, adx: ${sample.adx}, bbPct: ${sample.bbPct}`)
    console.log(`  volumeRatio: ${sample.volumeRatio}, macdHist: ${sample.macdHist}`)
    console.log(`  sparkline: ${sample.sparkline.length} days, ${sample.sparkline[0]?.[0]} to ${sample.sparkline[sample.sparkline.length-1]?.[0]}`)
  }
}

main()
