import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const csv = readFileSync(join(process.cwd(), 'results', 'walk_forward.csv'), 'utf8')
    const rows = parse(csv, { columns: true, skip_empty_lines: true })
    const folds = rows.map(r => ({
      fold: parseInt(r.fold) || 0,
      test_start: r.test_start || '',
      test_end: r.test_end || '',
      n_train: parseInt(r.n_train) || 0,
      n_test: parseInt(r.n_test) || 0,
      roc_auc: parseFloat(r.roc_auc) || 0,
      n_signals: parseInt(r.n_signals) || 0,
      win_rate: parseFloat(r.win_rate) || 0,
      avg_return: parseFloat(r.avg_return) || 0,
    }))
    res.json({ folds, message: 'Walk-forward analysis results' })
  } catch {
    res.json({ folds: [], message: 'No walk-forward data' })
  }
}
