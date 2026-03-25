"""Vercel serverless: /api/positions — feature importance from backtest."""

from http.server import BaseHTTPRequestHandler
import json
import csv
import os

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results')


def _read_csv(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # No live positions in backtest mode — return feature importance instead
        features = _read_csv('feature_importance.csv')
        for f in features:
            try:
                f['importance'] = round(float(f.get('importance', 0)), 4)
            except (ValueError, TypeError):
                f['importance'] = 0

        # Sort by importance descending
        features.sort(key=lambda x: x.get('importance', 0), reverse=True)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(features).encode())
