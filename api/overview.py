"""Vercel serverless: /api/overview — portfolio metrics and equity curve from backtest CSVs."""

from http.server import BaseHTTPRequestHandler
import json
import csv
import os

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results')
INITIAL_CAPITAL = 1_000_000


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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        portfolio = {
            "total_value": INITIAL_CAPITAL, "cash": 0, "invested": 0,
            "total_return_pct": 0, "drawdown_pct": 0, "peak_value": INITIAL_CAPITAL, "n_positions": 0,
        }
        equity_curve = []
        stats = {
            "total_trades": 0, "win_rate": 0, "profit_factor": 0,
            "avg_win": 0, "avg_loss": 0, "avg_hold_days": 0, "sharpe_ratio": 0,
        }

        # Equity curve from portfolio_history.csv
        rows = _read_csv('portfolio_history.csv')
        if rows:
            for row in rows[-500:]:
                equity_curve.append({
                    "date": row.get("date", ""),
                    "value": _safe_float(row.get("total_value", INITIAL_CAPITAL)),
                    "regime": row.get("regime", "UNKNOWN"),
                })
            last_val = _safe_float(rows[-1].get("total_value", INITIAL_CAPITAL))
            peak_val = max(_safe_float(r.get("total_value", 0)) for r in rows)
            portfolio["total_value"] = round(last_val, 2)
            portfolio["total_return_pct"] = round((last_val / INITIAL_CAPITAL - 1) * 100, 2)
            portfolio["peak_value"] = round(peak_val, 2)
            portfolio["drawdown_pct"] = round((last_val - peak_val) / max(peak_val, 1) * 100, 2)

        # Trade stats from trade_log.csv
        trades = _read_csv('trade_log.csv')
        if trades:
            returns = [_safe_float(t.get("return_pct")) for t in trades]
            pnls = [_safe_float(t.get("net_pnl")) for t in trades]
            holds = [_safe_float(t.get("hold_days")) for t in trades]
            wins = [r for r in returns if r > 0]
            losses = [r for r in returns if r <= 0]
            win_pnls = [p for r, p in zip(returns, pnls) if r > 0]
            loss_pnls = [p for r, p in zip(returns, pnls) if r <= 0]

            stats["total_trades"] = len(trades)
            stats["win_rate"] = round(len(wins) / len(trades) * 100, 1) if trades else 0
            stats["avg_win"] = round(sum(wins) / len(wins), 2) if wins else 0
            stats["avg_loss"] = round(sum(losses) / len(losses), 2) if losses else 0
            gross_win = sum(win_pnls)
            gross_loss = abs(sum(loss_pnls))
            stats["profit_factor"] = round(gross_win / gross_loss, 2) if gross_loss > 0 else 0
            stats["avg_hold_days"] = round(sum(holds) / len(holds), 1) if holds else 0

        data = {"portfolio": portfolio, "equity_curve": equity_curve, "metrics": stats}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
