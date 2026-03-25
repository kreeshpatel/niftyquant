"""Vercel serverless: /api/signals — walk-forward analysis results."""

from http.server import BaseHTTPRequestHandler
import json
import csv
import os

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results')


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _read_csv(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Repurposed: return walk-forward analysis results
        folds = _read_csv('walk_forward.csv')
        for f in folds:
            for key in ['roc_auc', 'win_rate', 'avg_return']:
                f[key] = _safe_float(f.get(key))
            for key in ['fold', 'n_train', 'n_test', 'n_signals']:
                try:
                    f[key] = int(float(f.get(key, 0)))
                except (ValueError, TypeError):
                    f[key] = 0

        data = {
            "folds": folds,
            "message": "Walk-forward analysis results",
        }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
