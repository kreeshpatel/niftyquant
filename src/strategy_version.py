"""
Upgrade 3C: Strategy Versioning
Tracks strategy configurations and performance across versions.
"""

import sys
import json
import hashlib
import os
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RESULTS_DIR, ensure_dirs
import config

ensure_dirs()

VERSIONS_DIR = RESULTS_DIR / "versions"
VERSION_HISTORY = RESULTS_DIR / "version_history.csv"


class StrategyVersionManager:

    def save_version(self, backtest_result, model_params: dict = None,
                     feature_list: list = None, notes: str = "") -> str:
        now = datetime.now()
        hash4 = hashlib.md5(now.isoformat().encode()).hexdigest()[:4]
        version_id = f"v{now.strftime('%Y%m%d')}_{hash4}"

        version_dir = VERSIONS_DIR / version_id
        version_dir.mkdir(parents=True, exist_ok=True)

        # Config snapshot
        cfg = {k: v for k, v in vars(config).items()
               if not k.startswith("_") and isinstance(v, (int, float, str, bool, list))}
        with open(version_dir / "config_snapshot.json", "w") as f:
            json.dump(cfg, f, indent=2, default=str)

        # Metrics summary
        r = backtest_result
        metrics = {
            "total_return_pct": r.total_return_pct,
            "annualised_return_pct": r.annualised_return_pct,
            "sharpe_ratio": r.sharpe_ratio,
            "sortino_ratio": r.sortino_ratio,
            "max_drawdown_pct": r.max_drawdown_pct,
            "total_trades": r.total_trades,
            "win_rate_pct": r.win_rate_pct,
            "profit_factor": r.profit_factor,
            "avg_hold_days": r.avg_hold_days,
            "alpha": r.alpha,
        }
        with open(version_dir / "metrics_summary.json", "w") as f:
            json.dump(metrics, f, indent=2)

        # Model params
        if model_params:
            with open(version_dir / "model_params.json", "w") as f:
                json.dump(model_params, f, indent=2)

        # Notes
        with open(version_dir / "notes.txt", "w") as f:
            f.write(notes)

        # Append to version history CSV
        row = {
            "version_id": version_id,
            "date": now.strftime("%Y-%m-%d %H:%M"),
            "total_return": r.total_return_pct,
            "sharpe": r.sharpe_ratio,
            "max_dd": r.max_drawdown_pct,
            "win_rate": r.win_rate_pct,
            "profit_factor": r.profit_factor,
            "notes": notes,
        }
        if VERSION_HISTORY.exists():
            hist = pd.read_csv(VERSION_HISTORY)
            hist = pd.concat([hist, pd.DataFrame([row])], ignore_index=True)
        else:
            hist = pd.DataFrame([row])
        hist.to_csv(VERSION_HISTORY, index=False)

        print(f"  Strategy version saved: {version_id}")
        print(f"  Location: {version_dir}")
        return version_id

    def compare(self, version_a: str, version_b: str):
        def _load(vid):
            p = VERSIONS_DIR / vid / "metrics_summary.json"
            with open(p) as f:
                return json.load(f)

        ma, mb = _load(version_a), _load(version_b)
        print(f"\n  {'Metric':<25} {'v_A':>12} {'v_B':>12} {'Delta':>10}")
        print(f"  {'-'*60}")
        for key in ma:
            va, vb = ma[key], mb[key]
            delta = vb - va if isinstance(va, (int, float)) else ""
            print(f"  {key:<25} {va:>12} {vb:>12} {delta:>+10.2f}" if delta != ""
                  else f"  {key:<25} {va:>12} {vb:>12}")

    def get_best(self, metric: str = "sharpe") -> str:
        if not VERSION_HISTORY.exists():
            return None
        hist = pd.read_csv(VERSION_HISTORY)
        if hist.empty:
            return None
        best = hist.loc[hist[metric].idxmax()]
        return best["version_id"]

    def list_versions(self):
        if not VERSION_HISTORY.exists():
            print("  No versions saved yet.")
            return
        hist = pd.read_csv(VERSION_HISTORY)
        print(hist.to_string(index=False))
