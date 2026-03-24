"""
Upgrade 3B: Tearsheet Report
Generates a standalone HTML performance report with embedded charts.
"""

import sys
import base64
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RESULTS_DIR, ensure_dirs

ensure_dirs()


def _img_to_base64(path: Path) -> str:
    if not path.exists():
        return ""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def _color(value, green_thresh, amber_thresh, invert=False):
    if invert:
        value = -value
        green_thresh = -green_thresh
        amber_thresh = -amber_thresh
    if value >= green_thresh:
        return "#4CAF50"
    elif value >= amber_thresh:
        return "#FF9800"
    return "#F44336"


class TearsheetGenerator:

    def generate(self, backtest_result, walk_forward_result=None,
                 monte_carlo_result=None, regime_history=None,
                 output_path="results/tearsheet.html"):

        r = backtest_result
        tl = r.trade_log if hasattr(r, "trade_log") else pd.DataFrame()

        # Monthly returns
        monthly = self._monthly_returns(r.equity_curve)

        # Build HTML
        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Strategy Tearsheet</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       max-width: 1100px; margin: 0 auto; padding: 20px; background: #fafafa; color: #333; }}
h1 {{ color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 10px; }}
h2 {{ color: #283593; margin-top: 30px; }}
.cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 15px 0; }}
.card {{ background: white; border-radius: 8px; padding: 15px; text-align: center;
         box-shadow: 0 1px 3px rgba(0,0,0,0.12); }}
.card .value {{ font-size: 24px; font-weight: bold; }}
.card .label {{ font-size: 12px; color: #666; margin-top: 4px; }}
table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
th, td {{ padding: 8px 12px; border: 1px solid #ddd; text-align: right; font-size: 13px; }}
th {{ background: #e8eaf6; font-weight: 600; }}
.badge {{ display: inline-block; padding: 4px 12px; border-radius: 12px; color: white;
          font-weight: bold; font-size: 13px; }}
.badge-green {{ background: #4CAF50; }}
.badge-red {{ background: #F44336; }}
.badge-amber {{ background: #FF9800; }}
img {{ max-width: 100%; border-radius: 8px; margin: 10px 0; }}
.section {{ background: white; border-radius: 8px; padding: 20px; margin: 15px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12); }}
</style></head><body>
<h1>Strategy Tearsheet</h1>
<p>{r.equity_curve.index[0].strftime('%Y-%m-%d')} to {r.equity_curve.index[-1].strftime('%Y-%m-%d')}
| Initial: Rs {r.initial_capital:,.0f} | Final: Rs {r.final_capital:,.0f}</p>
"""

        # Section 2: Key metrics cards
        metrics = [
            ("Total Return", f"{r.total_return_pct:+.1f}%", _color(r.total_return_pct, 10, 0)),
            ("Annualised", f"{r.annualised_return_pct:+.1f}%", _color(r.annualised_return_pct, 5, 0)),
            ("Sharpe", f"{r.sharpe_ratio:.2f}", _color(r.sharpe_ratio, 1.0, 0.5)),
            ("Sortino", f"{r.sortino_ratio:.2f}", _color(r.sortino_ratio, 1.0, 0.5)),
            ("Max Drawdown", f"{r.max_drawdown_pct:.1f}%", _color(r.max_drawdown_pct, -10, -20, invert=True)),
            ("Win Rate", f"{r.win_rate_pct:.1f}%", _color(r.win_rate_pct, 40, 30)),
            ("Profit Factor", f"{r.profit_factor:.2f}", _color(r.profit_factor, 1.5, 1.0)),
            ("Avg Hold", f"{r.avg_hold_days:.0f}d", "#666"),
        ]
        html += '<div class="section"><h2>Key Metrics</h2><div class="cards">'
        for label, value, color in metrics:
            html += f'<div class="card"><div class="value" style="color:{color}">{value}</div>'
            html += f'<div class="label">{label}</div></div>'
        html += '</div></div>'

        # Section 3: Equity curve
        ec_img = _img_to_base64(RESULTS_DIR / "equity_curve.png")
        if ec_img:
            html += f'<div class="section"><h2>Equity Curve</h2>'
            html += f'<img src="data:image/png;base64,{ec_img}"></div>'

        # Section 4: Monthly returns heatmap
        html += '<div class="section"><h2>Monthly Returns (%)</h2>'
        html += self._monthly_table_html(monthly)
        html += '</div>'

        # Section 5: Walk-forward
        if walk_forward_result and walk_forward_result.fold_results:
            wf = walk_forward_result
            badge = "badge-green" if wf.is_consistent else "badge-red"
            badge_text = "CONSISTENT" if wf.is_consistent else "INCONSISTENT"
            html += f'<div class="section"><h2>Walk-Forward Validation</h2>'
            html += f'<p>AUC: {wf.mean_roc_auc:.3f} +/- {wf.std_roc_auc:.3f} '
            html += f'<span class="badge {badge}">{badge_text}</span></p>'
            html += '<table><tr><th>Fold</th><th>Period</th><th>AUC</th><th>Signals</th>'
            html += '<th>Win Rate</th><th>Avg Return</th></tr>'
            for f in wf.fold_results:
                html += f'<tr><td>{f["fold"]}</td><td>{f["test_start"]} - {f["test_end"]}</td>'
                html += f'<td>{f["roc_auc"]:.3f}</td><td>{f["n_signals"]}</td>'
                html += f'<td>{f["win_rate"]:.1f}%</td><td>{f["avg_return"]:+.1f}%</td></tr>'
            html += '</table></div>'

        # Section 6: Monte Carlo
        mc_img = _img_to_base64(RESULTS_DIR / "monte_carlo.png")
        if monte_carlo_result and mc_img:
            mc = monte_carlo_result
            skill_badge = "badge-green" if mc.is_skill_likely else "badge-red"
            skill_text = "YES" if mc.is_skill_likely else "NO"
            html += f'<div class="section"><h2>Monte Carlo Analysis</h2>'
            html += f'<p>Skill likely: <span class="badge {skill_badge}">{skill_text}</span> '
            html += f'({mc.pct_sims_beat_actual:.0f}% of simulations beaten)</p>'
            html += f'<img src="data:image/png;base64,{mc_img}"></div>'

        # Section 7: Trade analysis
        if not tl.empty:
            html += '<div class="section"><h2>Trade Analysis</h2>'
            # Exit reason breakdown
            if "exit_reason" in tl.columns:
                counts = tl["exit_reason"].value_counts()
                html += '<p>Exit reasons: '
                for reason, count in counts.items():
                    html += f'{reason}: {count} ({count/len(tl)*100:.0f}%) | '
                html += '</p>'
            # Best/worst trades
            if "return_pct" in tl.columns:
                best = tl.nlargest(10, "return_pct")[["ticker", "entry_date", "return_pct", "hold_days"]]
                worst = tl.nsmallest(10, "return_pct")[["ticker", "entry_date", "return_pct", "hold_days"]]
                html += '<h3>Top 10 Best Trades</h3>' + best.to_html(index=False)
                html += '<h3>Top 10 Worst Trades</h3>' + worst.to_html(index=False)
            html += '</div>'

        # Section 8: Regime performance
        if regime_history is not None and not regime_history.empty and not tl.empty:
            html += '<div class="section"><h2>Regime Performance</h2>'
            html += '<p>Performance breakdown by market regime</p>'
            html += '</div>'

        # Section 9: Feature importance
        fi_img = _img_to_base64(RESULTS_DIR / "feature_importance.png")
        if fi_img:
            html += f'<div class="section"><h2>Feature Importance</h2>'
            html += f'<img src="data:image/png;base64,{fi_img}"></div>'

        html += f'<p style="text-align:center;color:#999;margin-top:30px;">'
        html += f'Generated {datetime.now().strftime("%Y-%m-%d %H:%M")} | NSE Algo Trading Engine</p>'
        html += '</body></html>'

        out = Path(output_path)
        out.write_text(html, encoding="utf-8")
        print(f"  Tearsheet saved to {out} ({len(html):,} bytes)")
        return out

    def _monthly_returns(self, equity: pd.Series) -> pd.DataFrame:
        monthly = equity.resample("ME").last().pct_change() * 100
        monthly = monthly.dropna()
        df = pd.DataFrame({"return": monthly})
        df["year"] = df.index.year
        df["month"] = df.index.month
        pivot = df.pivot_table(values="return", index="year", columns="month", aggfunc="sum")
        pivot.columns = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][:len(pivot.columns)]
        pivot["Annual"] = pivot.sum(axis=1)
        return pivot

    def _monthly_table_html(self, monthly: pd.DataFrame) -> str:
        html = '<table><tr><th>Year</th>'
        for col in monthly.columns:
            html += f'<th>{col}</th>'
        html += '</tr>'
        for year, row in monthly.iterrows():
            html += f'<tr><td><b>{year}</b></td>'
            for val in row:
                if pd.isna(val):
                    html += '<td></td>'
                else:
                    color = "#4CAF50" if val >= 0 else "#F44336"
                    html += f'<td style="color:{color}">{val:+.1f}</td>'
            html += '</tr>'
        html += '</table>'
        return html
