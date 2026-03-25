import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RESULTS_DIR = join(__dirname, '..', 'results')

export default function handler(req, res) {
  console.log('RESULTS_DIR:', RESULTS_DIR)
  try { console.log('Files:', readdirSync(RESULTS_DIR)) } catch (e) { console.log('readdirSync error:', e.message) }
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const csv = readFileSync(join(RESULTS_DIR, 'feature_importance.csv'), 'utf8')
    const rows = parse(csv, { columns: true, skip_empty_lines: true })
    const features = rows.map(r => ({
      feature: r.feature,
      importance: Math.round(parseFloat(r.importance) * 10000) / 10000,
    })).sort((a, b) => b.importance - a.importance)
    res.json(features)
  } catch {
    res.json([])
  }
}
