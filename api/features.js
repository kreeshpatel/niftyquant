import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const csv = readFileSync(join(process.cwd(), 'results', 'feature_importance.csv'), 'utf8')
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
