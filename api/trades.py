"""Vercel serverless: /api/trades — trade history with filtering and pagination."""

from http.server import BaseHTTPRequestHandler
import json
import csv
import os
from urllib.parse import urlparse, parse_qs

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results')


def _read_csv(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _load_all_trades():
    trades = []
    for name in ['trade_log.csv', 'paper_trades.csv']:
        trades.extend(_read_csv(name))
    # Convert numeric fields
    for t in trades:
        for key in ['entry_price', 'exit_price', 'return_pct', 'net_pnl', 'position_size']:
            if key in t:
                t[key] = _safe_float(t[key])
        for key in ['hold_days', 'shares']:
            if key in t:
                try:
                    t[key] = int(float(t[key]))
                except (ValueError, TypeError):
                    t[key] = 0
    return trades


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        path = parsed.path.rstrip('/')

        if path.endswith('/trades/stats'):
            self._handle_stats()
        elif path.endswith('/trades/export'):
            self._handle_export()
        else:
            self._handle_list(params)

    def _handle_list(self, params):
        page = int(params.get('page', ['1'])[0])
        per_page = int(params.get('per_page', ['50'])[0])
        ticker = params.get('ticker', [''])[0]
        start = params.get('start', [''])[0]
        end = params.get('end', [''])[0]
        exit_reason = params.get('exit_reason', [''])[0]

        trades = _load_all_trades()

        if ticker:
            trades = [t for t in trades if ticker.lower() in t.get('ticker', '').lower()]
        if start:
            trades = [t for t in trades if t.get('entry_date', '') >= start]
        if end:
            trades = [t for t in trades if t.get('entry_date', '') <= end]
        if exit_reason:
            trades = [t for t in trades if t.get('exit_reason', '') == exit_reason]

        total = len(trades)
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        start_idx = (page - 1) * per_page
        page_trades = trades[start_idx:start_idx + per_page]

        data = {"trades": page_trades, "total": total, "page": page, "pages": pages}
        self._json_response(data)

    def _handle_stats(self):
        trades = _load_all_trades()
        if not trades:
            self._json_response({"total_trades": 0})
            return

        returns = [t.get('return_pct', 0) for t in trades]
        wins = [r for r in returns if r > 0]
        losses = [r for r in returns if r <= 0]

        stats = {
            "total_trades": len(trades),
            "win_rate": round(len(wins) / len(trades) * 100, 1) if trades else 0,
            "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
            "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
            "best_trade": round(max(returns), 2) if returns else 0,
            "worst_trade": round(min(returns), 2) if returns else 0,
            "avg_hold_days": round(
                sum(t.get('hold_days', 0) for t in trades) / len(trades), 1
            ) if trades else 0,
        }

        exit_reasons = {}
        for t in trades:
            reason = t.get('exit_reason', 'unknown')
            exit_reasons[reason] = exit_reasons.get(reason, 0) + 1
        stats["by_exit_reason"] = exit_reasons

        self._json_response(stats)

    def _handle_export(self):
        path = os.path.join(RESULTS_DIR, 'trade_log.csv')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv')
            self.send_header('Content-Disposition', 'attachment; filename=trade_log.csv')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode())
        else:
            self._json_response({"error": "No trade log found"})

    def _json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
