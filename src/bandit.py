"""
Self-Improving Engine — Component 1: Contextual Bandit
LinUCB bandit that learns optimal position sizing
from trade outcomes across different market contexts.
"""

import sys
import json
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import MODELS_DIR, ensure_dirs

ensure_dirs()

# Arms: position size multipliers
ARM_MULTIPLIERS = [0.5, 1.0, 1.5]
N_ARMS = len(ARM_MULTIPLIERS)
N_CONTEXT = 8
ALPHA = 0.3  # exploration parameter


class ContextualBandit:

    def __init__(self, n_arms=N_ARMS, state_file=None):
        self.n_arms = n_arms
        self.state_file = Path(state_file) if state_file else MODELS_DIR / "bandit_state.json"
        # LinUCB state: A matrices and b vectors per arm
        self.A = [np.eye(N_CONTEXT) for _ in range(n_arms)]
        self.b = [np.zeros(N_CONTEXT) for _ in range(n_arms)]
        self.arm_counts = [0] * n_arms
        self.arm_rewards = [0.0] * n_arms
        self.total_updates = 0
        self.load()

    # ── Core LinUCB algorithm ─────────────────────────────

    def select_arm(self, context):
        """Select arm with highest UCB score."""
        context = np.asarray(context, dtype=float)
        best_arm = 0
        best_score = -np.inf

        for a in range(self.n_arms):
            A_inv = np.linalg.inv(self.A[a])
            theta = A_inv @ self.b[a]
            p = theta @ context + ALPHA * np.sqrt(context @ A_inv @ context)
            if p > best_score:
                best_score = p
                best_arm = a

        return best_arm

    def update(self, arm, context, reward):
        """Update arm parameters after observing trade reward."""
        context = np.asarray(context, dtype=float)
        self.A[arm] += np.outer(context, context)
        self.b[arm] += reward * context
        self.arm_counts[arm] += 1
        self.arm_rewards[arm] += reward
        self.total_updates += 1
        self.save()

    def get_size_multiplier(self, context):
        """Return position size multiplier for given context."""
        arm = self.select_arm(context)
        return ARM_MULTIPLIERS[arm]

    # ── Context builder ───────────────────────────────────

    @staticmethod
    def build_context(regime="BULL", adx=30, rsi=50, dip_conviction=1,
                      momentum_score=0.5, bb_pct=0.5, volume_ratio=1.0,
                      position_in_52w=0.6):
        """Build 8-dim context vector from market features."""
        regime_map = {"BULL": 1.0, "CHOPPY": 0.0, "BEAR": -1.0}
        return np.array([
            regime_map.get(regime, 0.0),
            min(adx / 50.0, 1.0),
            rsi / 100.0,
            min(dip_conviction / 2.0, 1.0),
            min(max(momentum_score, 0.0), 1.0),
            min(max(bb_pct, 0.0), 1.0),
            min(volume_ratio / 3.0, 1.0),
            min(max(position_in_52w, 0.0), 1.0),
        ], dtype=float)

    # ── Persistence ───────────────────────────────────────

    def save(self):
        state = {
            "A": [a.tolist() for a in self.A],
            "b": [b.tolist() for b in self.b],
            "arm_counts": self.arm_counts,
            "arm_rewards": self.arm_rewards,
            "total_updates": self.total_updates,
        }
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.state_file, "w") as f:
            json.dump(state, f)

    def load(self):
        if not self.state_file.exists():
            return
        try:
            with open(self.state_file) as f:
                state = json.load(f)
            self.A = [np.array(a) for a in state["A"]]
            self.b = [np.array(b) for b in state["b"]]
            self.arm_counts = state.get("arm_counts", [0] * self.n_arms)
            self.arm_rewards = state.get("arm_rewards", [0.0] * self.n_arms)
            self.total_updates = state.get("total_updates", 0)
        except Exception:
            pass  # start fresh

    # ── Stats ─────────────────────────────────────────────

    def get_stats(self):
        avg = [
            (self.arm_rewards[i] / self.arm_counts[i]) if self.arm_counts[i] > 0 else 0.0
            for i in range(self.n_arms)
        ]
        return {
            "arm_counts": dict(zip(["half", "normal", "large"], self.arm_counts)),
            "arm_avg_reward": dict(zip(["half", "normal", "large"], [round(a, 4) for a in avg])),
            "total_updates": self.total_updates,
        }


if __name__ == "__main__":
    print("=" * 60)
    print("  CONTEXTUAL BANDIT — TEST")
    print("=" * 60)

    bandit = ContextualBandit(state_file=MODELS_DIR / "bandit_state_test.json")

    # 3 scenario contexts
    ctx_bull = ContextualBandit.build_context(
        regime="BULL", adx=42, rsi=38, dip_conviction=2,
        momentum_score=0.75, bb_pct=0.02, volume_ratio=1.5, position_in_52w=0.85)
    ctx_choppy = ContextualBandit.build_context(
        regime="CHOPPY", adx=18, rsi=55, dip_conviction=1,
        momentum_score=0.3, bb_pct=0.5, volume_ratio=0.9, position_in_52w=0.4)
    ctx_medium = ContextualBandit.build_context(
        regime="BULL", adx=28, rsi=48, dip_conviction=1,
        momentum_score=0.55, bb_pct=0.3, volume_ratio=1.1, position_in_52w=0.65)

    print(f"\n  Initial arm selection (before learning):")
    print(f"    BULL+deep dip  : arm {bandit.select_arm(ctx_bull)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_bull)]}x)")
    print(f"    CHOPPY+weak    : arm {bandit.select_arm(ctx_choppy)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_choppy)]}x)")
    print(f"    BULL+medium    : arm {bandit.select_arm(ctx_medium)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_medium)]}x)")

    # Simulate 50 trades with biased rewards
    rng = np.random.default_rng(42)
    for _ in range(50):
        # Bull+dip trades: good rewards for arm 2 (large size)
        reward = rng.normal(0.8, 0.3)
        bandit.update(2, ctx_bull, reward)

        # Choppy trades: small or negative for arm 2, OK for arm 0
        reward_bad = rng.normal(-0.2, 0.4)
        bandit.update(2, ctx_choppy, reward_bad)
        reward_ok = rng.normal(0.3, 0.2)
        bandit.update(0, ctx_choppy, reward_ok)

        # Medium: arm 1 is fine
        reward_med = rng.normal(0.4, 0.3)
        bandit.update(1, ctx_medium, reward_med)

    print(f"\n  After 200 simulated updates:")
    print(f"    BULL+deep dip  : arm {bandit.select_arm(ctx_bull)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_bull)]}x)")
    print(f"    CHOPPY+weak    : arm {bandit.select_arm(ctx_choppy)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_choppy)]}x)")
    print(f"    BULL+medium    : arm {bandit.select_arm(ctx_medium)} "
          f"({ARM_MULTIPLIERS[bandit.select_arm(ctx_medium)]}x)")

    stats = bandit.get_stats()
    print(f"\n  Stats:")
    print(f"    Arm counts:      {stats['arm_counts']}")
    print(f"    Arm avg reward:  {stats['arm_avg_reward']}")
    print(f"    Total updates:   {stats['total_updates']}")

    # Cleanup test state
    test_path = MODELS_DIR / "bandit_state_test.json"
    if test_path.exists():
        test_path.unlink()
    print(f"\n  Test complete.\n")
