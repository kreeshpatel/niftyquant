"""
Upgrade 3A: Monte Carlo Simulation
Tests whether strategy returns come from genuine edge or lucky trade ordering.
"""

import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RESULTS_DIR, INITIAL_CAPITAL, ensure_dirs

ensure_dirs()


@dataclass
class MonteCarloResult:
    n_simulations: int
    actual_return: float
    actual_drawdown: float
    actual_sharpe: float
    pct_sims_beat_actual: float
    median_return: float
    p5_return: float
    p95_return: float
    p5_drawdown: float
    p95_drawdown: float
    is_skill_likely: bool


class MonteCarloSimulator:

    def run(self, trade_log: pd.DataFrame, n_simulations: int = 1000,
            initial_capital: float = INITIAL_CAPITAL) -> MonteCarloResult:

        if trade_log.empty or "return_pct" not in trade_log.columns:
            print("  No trades for Monte Carlo simulation.")
            return None

        returns = trade_log["return_pct"].values / 100.0
        n_trades = len(returns)

        # Actual performance
        actual_equity = initial_capital
        actual_peak = initial_capital
        actual_max_dd = 0.0
        actual_daily_rets = []
        for r in returns:
            actual_equity *= (1 + r)
            actual_daily_rets.append(r)
            actual_peak = max(actual_peak, actual_equity)
            dd = (actual_equity - actual_peak) / actual_peak
            actual_max_dd = min(actual_max_dd, dd)
        actual_return = (actual_equity / initial_capital - 1) * 100
        actual_dd = actual_max_dd * 100
        dr = np.array(actual_daily_rets)
        actual_sharpe = (dr.mean() / dr.std() * np.sqrt(252)) if dr.std() > 0 else 0.0

        # Simulations
        rng = np.random.default_rng(42)
        sim_returns = []
        sim_drawdowns = []
        sim_sharpes = []

        for _ in range(n_simulations):
            shuffled = rng.permutation(returns)
            equity = initial_capital
            peak = initial_capital
            max_dd = 0.0
            rets = []
            for r in shuffled:
                equity *= (1 + r)
                rets.append(r)
                peak = max(peak, equity)
                dd = (equity - peak) / peak
                max_dd = min(max_dd, dd)
            sim_returns.append((equity / initial_capital - 1) * 100)
            sim_drawdowns.append(max_dd * 100)
            sr = np.array(rets)
            sim_sharpes.append((sr.mean() / sr.std() * np.sqrt(252)) if sr.std() > 0 else 0.0)

        sim_returns = np.array(sim_returns)
        sim_drawdowns = np.array(sim_drawdowns)

        pct_beaten = (sim_returns < actual_return).sum() / n_simulations * 100
        p75_ret = np.percentile(sim_returns, 75)
        is_skill = actual_return > p75_ret

        result = MonteCarloResult(
            n_simulations=n_simulations,
            actual_return=round(actual_return, 2),
            actual_drawdown=round(actual_dd, 2),
            actual_sharpe=round(actual_sharpe, 2),
            pct_sims_beat_actual=round(pct_beaten, 1),
            median_return=round(float(np.median(sim_returns)), 2),
            p5_return=round(float(np.percentile(sim_returns, 5)), 2),
            p95_return=round(float(np.percentile(sim_returns, 95)), 2),
            p5_drawdown=round(float(np.percentile(sim_drawdowns, 5)), 2),
            p95_drawdown=round(float(np.percentile(sim_drawdowns, 95)), 2),
            is_skill_likely=is_skill,
        )

        self._print_report(result)
        self._plot(sim_returns, result)

        return result

    def _print_report(self, r: MonteCarloResult):
        eq = "=" * 50
        ln = "-" * 50
        skill = "YES" if r.is_skill_likely else "NO"
        print(f"\n  +{eq}+")
        print(f"  |{'MONTE CARLO SIMULATION':^50}|")
        print(f"  |{f'{r.n_simulations:,} random trade sequences':^50}|")
        print(f"  +{ln}+")
        print(f"  | Actual return      : {r.actual_return:>+8.1f}%{' '*19}|")
        print(f"  | Median sim return  : {r.median_return:>+8.1f}%{' '*19}|")
        print(f"  | 5th pct return     : {r.p5_return:>+8.1f}%  (bad luck){' '*7}|")
        print(f"  | 95th pct return    : {r.p95_return:>+8.1f}%  (good luck){' '*6}|")
        print(f"  | % sims beaten      : {r.pct_sims_beat_actual:>8.0f}%{' '*19}|")
        print(f"  | Skill likely       : {skill:>8}{' '*20}|")
        print(f"  +{ln}+")
        print(f"  | Max DD range       : {r.p5_drawdown:>+.1f}% to {r.p95_drawdown:>+.1f}%{' '*14}|")
        print(f"  +{eq}+")

    def _plot(self, sim_returns: np.ndarray, r: MonteCarloResult):
        fig, ax = plt.subplots(figsize=(10, 6))
        n_bins = min(50, max(10, len(set(np.round(sim_returns, 2)))))
        ax.hist(sim_returns, bins=n_bins, color="#90CAF9", edgecolor="white", alpha=0.8)
        ax.axvline(r.actual_return, color="red", linewidth=2,
                   label=f"Actual: {r.actual_return:+.1f}%")
        p5 = np.percentile(sim_returns, 5)
        p95 = np.percentile(sim_returns, 95)
        ax.axvspan(p5, p95, alpha=0.15, color="#2196F3", label="5th-95th percentile")
        ax.set_xlabel("Total Return (%)")
        ax.set_ylabel("Frequency")
        ax.set_title(f"Is our edge real? ({r.pct_sims_beat_actual:.0f}% of simulations beaten)")
        ax.legend()
        ax.grid(axis="y", alpha=0.3)
        path = RESULTS_DIR / "monte_carlo.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"  Monte Carlo chart saved to {path}")
