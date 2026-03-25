"""
Phase 4: ML Prediction Model
Random Forest classifier that scores rule-based entry signals.
Supports automatic retraining every 90 days to adapt to regime shifts.
"""

import sys
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, roc_curve,
)

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    DATA_DIR, MODELS_DIR, RESULTS_DIR, NIFTY_500,
    BUY_THRESHOLD, ensure_dirs,
)

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"
MODEL_PATH = MODELS_DIR / "rf_model.pkl"
FEATURE_COLS_PATH = MODELS_DIR / "feature_columns.pkl"
METADATA_PATH = MODELS_DIR / "model_metadata.json"

MODEL_V1_PATH = MODELS_DIR / "rf_model_v1.pkl"
MODEL_V2_PATH = MODELS_DIR / "rf_model_v2.pkl"

RETRAIN_INTERVAL_DAYS = 90
TRAIN_CUTOFF = "2024-01-01"

FEATURE_COLUMNS = [
    # Trend (8)
    "ema_9", "ema_21", "ema_50",
    "ema_9_above_21", "ema_21_above_50",
    "ema_cross_up", "price_vs_ema21_pct", "ema9_vs_ema21_pct",
    # ADX (3)
    "adx_14", "adx_above_25", "adx_slope",
    # Momentum (9)
    "rsi_14", "rsi_above_50", "rsi_overbought", "rsi_oversold",
    "macd_line", "macd_signal", "macd_histogram", "macd_above_signal",
    "roc_10",
    # Stochastic (3)
    "stoch_k", "stoch_d", "stoch_above_50",
    # Volatility (8)
    "bb_upper", "bb_middle", "bb_lower",
    "bb_width", "bb_pct", "bb_squeeze",
    "atr_14", "atr_pct",
    # Volume (5)
    "obv", "obv_ema", "obv_above_ema",
    "volume_ratio", "volume_spike",
    # Price action (6)
    "return_1d", "return_5d", "return_10d", "return_20d",
    "hl_range_pct", "body_pct",
    # Support/Resistance (5)
    "high_52w", "low_52w",
    "dist_from_52w_high", "dist_from_52w_low", "position_in_52w",
]

HYBRID_FEATURE_COLUMNS = FEATURE_COLUMNS + [
    # Hybrid dip signals (7)
    "rsi_dip_signal", "bb_dip_signal", "red_candle_signal",
    "dip_count", "dip_conviction",
    "in_momentum_regime", "hybrid_signal",
]

# Color groups for plotting
FEATURE_GROUPS = {
    "Trend": ["ema_9", "ema_21", "ema_50", "ema_9_above_21", "ema_21_above_50",
              "ema_cross_up", "price_vs_ema21_pct", "ema9_vs_ema21_pct"],
    "ADX": ["adx_14", "adx_above_25", "adx_slope"],
    "Momentum": ["rsi_14", "rsi_above_50", "rsi_overbought", "rsi_oversold",
                  "macd_line", "macd_signal", "macd_histogram", "macd_above_signal", "roc_10"],
    "Stochastic": ["stoch_k", "stoch_d", "stoch_above_50"],
    "Volatility": ["bb_upper", "bb_middle", "bb_lower", "bb_width", "bb_pct",
                    "bb_squeeze", "atr_14", "atr_pct"],
    "Volume": ["obv", "obv_ema", "obv_above_ema", "volume_ratio", "volume_spike"],
    "Price Action": ["return_1d", "return_5d", "return_10d", "return_20d",
                      "hl_range_pct", "body_pct"],
    "Support/Resistance": ["high_52w", "low_52w", "dist_from_52w_high",
                            "dist_from_52w_low", "position_in_52w"],
    "Hybrid Dip": ["rsi_dip_signal", "bb_dip_signal", "red_candle_signal",
                    "dip_count", "dip_conviction", "in_momentum_regime", "hybrid_signal"],
}

GROUP_COLORS = {
    "Trend": "#2196F3", "ADX": "#1565C0",
    "Momentum": "#009688", "Stochastic": "#00796B",
    "Volatility": "#9C27B0", "Volume": "#FF8F00",
    "Price Action": "#FF5722", "Support/Resistance": "#4CAF50",
    "Hybrid Dip": "#E91E63",
}


def _feature_to_group(feat: str) -> str:
    for group, feats in FEATURE_GROUPS.items():
        if feat in feats:
            return group
    return "Other"


class MLModel:

    def __init__(self):
        self.model = None
        self.feature_columns = FEATURE_COLUMNS
        self.last_trained = None

    # ── Metadata & retrain schedule ──────────────────────

    def _save_metadata(self, version="v1"):
        self.last_trained = datetime.now()
        meta = {
            "last_trained": self.last_trained.isoformat(),
            "retrain_interval_days": RETRAIN_INTERVAL_DAYS,
            "n_features": len(self.feature_columns),
            "model_version": version,
        }
        with open(METADATA_PATH, "w") as f:
            json.dump(meta, f, indent=2)

    def _load_metadata(self):
        if METADATA_PATH.exists():
            with open(METADATA_PATH) as f:
                meta = json.load(f)
            self.last_trained = datetime.fromisoformat(meta["last_trained"])
        else:
            self.last_trained = None

    def needs_retrain(self) -> bool:
        """True if model is missing or was trained more than 90 days ago."""
        if not MODEL_PATH.exists():
            return True
        self._load_metadata()
        if self.last_trained is None:
            return True
        age = datetime.now() - self.last_trained
        return age > timedelta(days=RETRAIN_INTERVAL_DAYS)

    def days_since_trained(self) -> int:
        """Days since last training, or -1 if never trained."""
        self._load_metadata()
        if self.last_trained is None:
            return -1
        return (datetime.now() - self.last_trained).days

    def ensure_current(self):
        """Load model, retraining first if stale. Called by Phase 5 daily runner."""
        if self.needs_retrain():
            age = self.days_since_trained()
            if age < 0:
                print("  ML model not found — training from scratch...")
            else:
                print(f"  ML model is {age} days old (limit: {RETRAIN_INTERVAL_DAYS}) "
                      f"— retraining...")
            self.train()
        else:
            self.load()
            age = self.days_since_trained()
            print(f"  ML model loaded (trained {age} days ago, "
                  f"next retrain in {RETRAIN_INTERVAL_DAYS - age} days)")

    # ── Data loading ─────────────────────────────────────

    def _load_all_features(self) -> pd.DataFrame:
        print("  Loading feature data...")
        frames = []
        for ticker in NIFTY_500:
            path = FEATURES_DIR / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            df["ticker"] = ticker
            frames.append(df)
        master = pd.concat(frames, axis=0)
        print(f"  Loaded {len(frames)} stocks, {len(master):,} total rows")
        return master

    def _prepare_dataset(self, master: pd.DataFrame, target_col="target"):
        # Drop rows without the specified target
        df = master.dropna(subset=[target_col]).copy()

        # Keep only feature columns + targets + future_return
        keep_cols = list(set(
            self.feature_columns
            + [target_col, "target", "future_return_10d", "ticker"]
            + (["hybrid_target"] if "hybrid_target" in df.columns else [])
        ))
        keep_cols = [c for c in keep_cols if c in df.columns]
        df = df[keep_cols].copy()

        # Drop rows with NaN in any feature
        before = len(df)
        df = df.dropna(subset=self.feature_columns)
        dropped = before - len(df)
        if dropped > 0:
            print(f"  Dropped {dropped:,} rows with NaN features")

        # Time-based split
        train = df[df.index < TRAIN_CUTOFF]
        test = df[df.index >= TRAIN_CUTOFF]

        print(f"  Training: {len(train):,} rows "
              f"({train['ticker'].nunique()} stocks, "
              f"{train.index.min().date()} to {train.index.max().date()})")
        print(f"  Testing:  {len(test):,} rows "
              f"({test['ticker'].nunique()} stocks, "
              f"{test.index.min().date()} to {test.index.max().date()})")

        return train, test

    # ── Training ─────────────────────────────────────────

    def train(self):
        print(f"\n{'='*70}")
        print("  ML MODEL TRAINING")
        print(f"{'='*70}\n")

        master = self._load_all_features()
        train_df, test_df = self._prepare_dataset(master)

        X_train = train_df[self.feature_columns].values
        y_train = train_df["target"].values.astype(int)
        X_test = test_df[self.feature_columns].values
        y_test = test_df["target"].values.astype(int)

        print(f"\n  Training Random Forest (500 trees, max_depth=8)...")
        self.model = RandomForestClassifier(
            n_estimators=500,
            max_depth=8,
            min_samples_leaf=50,
            max_features="sqrt",
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)
        print("  Training complete.")

        # Save model, feature columns, and metadata
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.feature_columns, FEATURE_COLS_PATH)
        self._save_metadata()
        print(f"  Model saved to {MODEL_PATH}")

        # Feature importance
        importances = pd.DataFrame({
            "feature": self.feature_columns,
            "importance": self.model.feature_importances_,
        }).sort_values("importance", ascending=False)
        importances.to_csv(RESULTS_DIR / "feature_importance.csv", index=False)

        # Evaluate
        self._evaluate_and_report(X_test, y_test, test_df, importances)

        return self.model

    # ── Evaluation ───────────────────────────────────────

    def _evaluate_and_report(self, X_test, y_test, test_df, importances):
        y_prob = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        acc = accuracy_score(y_test, y_pred) * 100
        prec = precision_score(y_test, y_pred, zero_division=0) * 100
        rec = recall_score(y_test, y_pred, zero_division=0) * 100
        f1 = f1_score(y_test, y_pred, zero_division=0) * 100
        auc = roc_auc_score(y_test, y_prob)

        eq = "=" * 50
        ln = "-" * 50

        print(f"\n  +{eq}+")
        print(f"  |{'ML MODEL EVALUATION':^50}|")
        print(f"  +{eq}+")
        print(f"  | {'DATASET':<48} |")
        print(f"  | Training rows  : {len(test_df):>10,}{' '*20}|")
        # Re-derive counts from model
        n_train = self.model.n_features_in_  # just use feature count
        print(f"  | Test rows      : {len(y_test):>10,}{' '*20}|")
        print(f"  | Features       : {len(self.feature_columns):>10}{' '*20}|")
        print(f"  +{ln}+")
        print(f"  | {'TEST SET PERFORMANCE':<48} |")
        print(f"  | Accuracy       : {acc:>10.1f}%{' '*19}|")
        print(f"  | Precision (buy): {prec:>10.1f}%{' '*19}|")
        print(f"  | Recall (buy)   : {rec:>10.1f}%{' '*19}|")
        print(f"  | F1 Score       : {f1:>10.1f}%{' '*19}|")
        print(f"  | ROC-AUC        : {auc:>10.3f}{' '*20}|")

        # Signal quality at BUY_THRESHOLD
        thr = BUY_THRESHOLD
        signals = y_prob >= thr
        n_signals = signals.sum()
        if n_signals > 0:
            wins = (y_test[signals] == 1).sum()
            losses = n_signals - wins
            win_rate = wins / n_signals * 100
            avg_ret_buy = test_df["future_return_10d"].values[signals].mean()
            avg_ret_skip = test_df["future_return_10d"].values[~signals].mean()
        else:
            wins = losses = 0
            win_rate = avg_ret_buy = avg_ret_skip = 0.0

        print(f"  +{ln}+")
        print(f"  | {'SIGNAL QUALITY AT THRESHOLD %.2f' % thr:<48} |")
        print(f"  | Signals generated : {n_signals:>8}{' '*20}|")
        print(f"  | Of those, won     : {wins:>8} ({win_rate:.1f}%){' '*11}|")
        print(f"  | Of those, lost    : {losses:>8} ({100-win_rate:.1f}%){' '*11}|")
        print(f"  | Avg return on buy : {avg_ret_buy:>+8.1f}%{' '*19}|")
        print(f"  | Avg return on skip: {avg_ret_skip:>+8.1f}%{' '*19}|")

        # Threshold analysis
        print(f"  +{ln}+")
        print(f"  | {'THRESHOLD ANALYSIS':<48} |")
        print(f"  | {'Threshold':>10} {'Signals':>8} {'WinRate':>8} {'AvgReturn':>10}   |")
        for t in [0.50, 0.55, 0.60, 0.65, 0.70, 0.75]:
            mask = y_prob >= t
            n = mask.sum()
            if n > 0:
                wr = (y_test[mask] == 1).sum() / n * 100
                ar = test_df["future_return_10d"].values[mask].mean()
            else:
                wr = ar = 0.0
            marker = " <--" if abs(t - BUY_THRESHOLD) < 0.001 else "    "
            print(f"  | {t:>10.2f} {n:>8} {wr:>7.1f}% {ar:>+9.1f}%{marker} |")

        # Top 15 features
        print(f"  +{ln}+")
        print(f"  | {'TOP 15 MOST IMPORTANT FEATURES':<48} |")
        for i, row in importances.head(15).iterrows():
            name = row["feature"]
            imp = row["importance"] * 100
            print(f"  | {i+1:>2}. {name:<26}: {imp:>5.1f}%{' '*10}|")
        print(f"  +{eq}+")

        # Save charts
        self._plot_feature_importance(importances)
        self._plot_roc_curve(y_test, y_prob, auc)
        self._plot_threshold_analysis(y_test, y_prob, test_df)

    def _plot_feature_importance(self, importances: pd.DataFrame):
        top20 = importances.head(20).iloc[::-1]  # reverse for horizontal bars
        colors = [GROUP_COLORS.get(_feature_to_group(f), "#888")
                  for f in top20["feature"]]

        fig, ax = plt.subplots(figsize=(10, 8))
        ax.barh(top20["feature"], top20["importance"] * 100, color=colors)
        ax.set_xlabel("Importance (%)")
        ax.set_title("Top 20 Feature Importances (Random Forest)")
        ax.grid(axis="x", alpha=0.3)

        # Legend
        from matplotlib.patches import Patch
        handles = [Patch(color=c, label=g) for g, c in GROUP_COLORS.items()]
        ax.legend(handles=handles, loc="lower right", fontsize=8)

        path = RESULTS_DIR / "feature_importance.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"\n  Feature importance chart saved to {path}")

    def _plot_roc_curve(self, y_test, y_prob, auc):
        fpr, tpr, _ = roc_curve(y_test, y_prob)

        fig, ax = plt.subplots(figsize=(8, 6))
        ax.plot(fpr, tpr, color="#2196F3", linewidth=2,
                label=f"Random Forest (AUC = {auc:.3f})")
        ax.plot([0, 1], [0, 1], "k--", alpha=0.4, label="Random (AUC = 0.500)")
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title("ROC Curve — Buy Signal Classifier")
        ax.legend(loc="lower right")
        ax.grid(True, alpha=0.3)

        path = RESULTS_DIR / "roc_curve.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"  ROC curve saved to {path}")

    def _plot_threshold_analysis(self, y_test, y_prob, test_df):
        thresholds = np.arange(0.40, 0.81, 0.01)
        counts = []
        win_rates = []
        avg_returns = []
        future_rets = test_df["future_return_10d"].values

        for t in thresholds:
            mask = y_prob >= t
            n = mask.sum()
            counts.append(n)
            if n > 0:
                wr = (y_test[mask] == 1).sum() / n * 100
                ar = future_rets[mask].mean()
            else:
                wr = ar = 0.0
            win_rates.append(wr)
            avg_returns.append(ar)

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 7), sharex=True,
                                        gridspec_kw={"hspace": 0.08})

        ax1.bar(thresholds, counts, width=0.008, color="#2196F3", alpha=0.7)
        ax1.axvline(BUY_THRESHOLD, color="red", linestyle="--", alpha=0.7,
                     label=f"Threshold = {BUY_THRESHOLD}")
        ax1.set_ylabel("Signal Count")
        ax1.set_title("Threshold Analysis")
        ax1.legend()
        ax1.grid(axis="y", alpha=0.3)

        ax2.plot(thresholds, win_rates, color="#4CAF50", linewidth=2, label="Win Rate %")
        ax2r = ax2.twinx()
        ax2r.plot(thresholds, avg_returns, color="#FF5722", linewidth=2, label="Avg Return %")
        ax2.axvline(BUY_THRESHOLD, color="red", linestyle="--", alpha=0.7)
        ax2.set_xlabel("Probability Threshold")
        ax2.set_ylabel("Win Rate (%)", color="#4CAF50")
        ax2r.set_ylabel("Avg Return (%)", color="#FF5722")
        ax2.grid(axis="y", alpha=0.3)

        lines1, labels1 = ax2.get_legend_handles_labels()
        lines2, labels2 = ax2r.get_legend_handles_labels()
        ax2.legend(lines1 + lines2, labels1 + labels2, loc="upper left")

        path = RESULTS_DIR / "threshold_analysis.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"  Threshold analysis chart saved to {path}")

    # ── Prediction ───────────────────────────────────────

    def load(self):
        self.model = joblib.load(MODEL_PATH)
        self.feature_columns = joblib.load(FEATURE_COLS_PATH)
        self._load_metadata()

    def predict(self, ticker: str, date: str) -> float:
        if self.model is None:
            self.load()
        path = FEATURES_DIR / f"{ticker}.NS.csv"
        df = pd.read_csv(path, index_col="Date", parse_dates=True)
        if pd.Timestamp(date) not in df.index:
            return 0.0
        row = df.loc[[pd.Timestamp(date)], self.feature_columns]
        if row.isna().any(axis=1).iloc[0]:
            return 0.0
        return float(self.model.predict_proba(row.values)[:, 1][0])

    def predict_batch(self, df: pd.DataFrame) -> pd.Series:
        if self.model is None:
            self.load()
        X = df[self.feature_columns]
        valid = ~X.isna().any(axis=1)
        scores = pd.Series(0.0, index=df.index)
        if valid.any():
            scores[valid] = self.model.predict_proba(X[valid].values)[:, 1]
        return scores

    def evaluate(self) -> dict:
        if self.model is None:
            self.load()
        master = self._load_all_features()
        _, test_df = self._prepare_dataset(master)
        X_test = test_df[self.feature_columns].values
        y_test = test_df["target"].values.astype(int)
        y_prob = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)
        return {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1": f1_score(y_test, y_pred, zero_division=0),
            "roc_auc": roc_auc_score(y_test, y_prob),
        }

    def top_signals_today(self, n: int = 5):
        """Get top N highest-scoring stocks for the most recent date."""
        if self.model is None:
            self.load()
        scores = []
        for ticker in NIFTY_500:
            path = FEATURES_DIR / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            if df.empty:
                continue
            last_row = df.iloc[[-1]]
            last_date = last_row.index[0]
            X = last_row[self.feature_columns]
            if X.isna().any(axis=1).iloc[0]:
                continue
            prob = float(self.model.predict_proba(X.values)[:, 1][0])
            scores.append({
                "ticker": ticker, "date": last_date.strftime("%Y-%m-%d"),
                "ml_score": round(prob, 4),
                "rsi_14": round(last_row["rsi_14"].iloc[0], 1),
                "adx_14": round(last_row["adx_14"].iloc[0], 1),
                "ema_cross_up": int(last_row["ema_cross_up"].iloc[0]),
            })
        scores_df = pd.DataFrame(scores).sort_values("ml_score", ascending=False)
        return scores_df.head(n)


# ── Walk-Forward Validation ──────────────────────────────

@dataclass
class WalkForwardResult:
    fold_results: list
    mean_roc_auc: float
    std_roc_auc: float
    mean_win_rate: float
    std_win_rate: float
    mean_avg_return: float
    is_consistent: bool


class WalkForwardValidator:

    def __init__(self):
        self.feature_columns = FEATURE_COLUMNS

    def _load_master(self) -> pd.DataFrame:
        print("  Loading feature data for walk-forward...")
        frames = []
        for ticker in NIFTY_500:
            path = FEATURES_DIR / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            df["ticker"] = ticker
            frames.append(df)
        master = pd.concat(frames, axis=0)
        master = master.dropna(subset=["target"])
        master = master.dropna(subset=self.feature_columns)
        print(f"  {len(master):,} labelled rows loaded")
        return master

    def run(self, n_splits: int = 6) -> WalkForwardResult:
        print(f"\n{'='*70}")
        print(f"  WALK-FORWARD VALIDATION ({n_splits} folds)")
        print(f"{'='*70}\n")

        master = self._load_master()
        all_dates = master.index.sort_values().unique()

        # Build folds: expanding train window, 6-month test windows
        fold_boundaries = pd.date_range("2024-01-01", periods=n_splits, freq="6MS")
        fold_boundaries = fold_boundaries[fold_boundaries <= all_dates[-1]]
        n_splits = len(fold_boundaries)

        fold_results = []
        for i, test_start in enumerate(fold_boundaries):
            test_end = test_start + pd.DateOffset(months=6)
            train_data = master[master.index < test_start]
            test_data = master[(master.index >= test_start) & (master.index < test_end)]

            if len(train_data) < 1000 or len(test_data) < 100:
                continue

            X_train = train_data[self.feature_columns].values
            y_train = train_data["target"].values.astype(int)
            X_test = test_data[self.feature_columns].values
            y_test = test_data["target"].values.astype(int)

            rf = RandomForestClassifier(
                n_estimators=500, max_depth=8, min_samples_leaf=50,
                max_features="sqrt", class_weight="balanced",
                random_state=42, n_jobs=-1,
            )
            rf.fit(X_train, y_train)
            y_prob = rf.predict_proba(X_test)[:, 1]

            auc = roc_auc_score(y_test, y_prob) if len(set(y_test)) > 1 else 0.5
            mask = y_prob >= BUY_THRESHOLD
            n_signals = mask.sum()
            wr = (y_test[mask] == 1).sum() / n_signals * 100 if n_signals > 0 else 0.0
            avg_ret = test_data["future_return_10d"].values[mask].mean() if n_signals > 0 else 0.0

            fold = {
                "fold": i + 1,
                "test_start": test_start.strftime("%Y-%m"),
                "test_end": min(test_end, all_dates[-1]).strftime("%Y-%m"),
                "n_train": len(train_data),
                "n_test": len(test_data),
                "roc_auc": round(auc, 3),
                "n_signals": int(n_signals),
                "win_rate": round(wr, 1),
                "avg_return": round(float(avg_ret), 2),
            }
            fold_results.append(fold)

        if not fold_results:
            print("  No valid folds.")
            return WalkForwardResult([], 0, 0, 0, 0, 0, False)

        aucs = [f["roc_auc"] for f in fold_results]
        wrs = [f["win_rate"] for f in fold_results]
        ars = [f["avg_return"] for f in fold_results]

        result = WalkForwardResult(
            fold_results=fold_results,
            mean_roc_auc=round(np.mean(aucs), 3),
            std_roc_auc=round(np.std(aucs), 3),
            mean_win_rate=round(np.mean(wrs), 1),
            std_win_rate=round(np.std(wrs), 1),
            mean_avg_return=round(np.mean(ars), 2),
            is_consistent=np.std(aucs) < 0.05,
        )

        # Print table
        print(f"  {'Fold':>4} {'Test Period':<24} {'ROC-AUC':>8} {'Signals':>8} "
              f"{'WinRate':>8} {'AvgRet':>8}")
        print(f"  {'-'*65}")
        for f in fold_results:
            print(f"  {f['fold']:>4} {f['test_start']} to {f['test_end']:<14} "
                  f"{f['roc_auc']:>8.3f} {f['n_signals']:>8} "
                  f"{f['win_rate']:>7.1f}% {f['avg_return']:>+7.1f}%")

        consistent = "YES" if result.is_consistent else "NO"
        print(f"\n  Walk-forward AUC: {result.mean_roc_auc:.3f} +/- {result.std_roc_auc:.3f}")
        print(f"  Walk-forward Win Rate: {result.mean_win_rate:.1f}% +/- {result.std_win_rate:.1f}%")
        print(f"  Consistent: {consistent}")
        if not result.is_consistent:
            print("  WARNING: Model may be overfit to a specific time period.")

        # Save
        pd.DataFrame(fold_results).to_csv(RESULTS_DIR / "walk_forward.csv", index=False)

        # Chart
        self._plot(fold_results)

        return result

    def _plot(self, folds: list):
        labels = [f"F{f['fold']}" for f in folds]
        aucs = [f["roc_auc"] for f in folds]
        wrs = [f["win_rate"] for f in folds]

        fig, ax1 = plt.subplots(figsize=(10, 5))
        x = range(len(labels))
        ax1.plot(x, aucs, "o-", color="#2196F3", linewidth=2, label="ROC-AUC")
        ax1.set_ylabel("ROC-AUC", color="#2196F3")
        ax1.set_xticks(x)
        ax1.set_xticklabels(labels)
        ax1.grid(axis="y", alpha=0.3)

        ax2 = ax1.twinx()
        ax2.bar(x, wrs, alpha=0.3, color="#4CAF50", label="Win Rate %")
        ax2.set_ylabel("Win Rate (%)", color="#4CAF50")

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
        ax1.set_title("Walk-Forward Validation: AUC & Win Rate per Fold")

        path = RESULTS_DIR / "walk_forward.png"
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"  Walk-forward chart saved to {path}")


def compare_models():
    """Train v1 (original) and v2 (hybrid) side-by-side and report."""
    print(f"\n{'='*70}")
    print("  MODEL COMPARISON: v1 (original) vs v2 (hybrid)")
    print(f"{'='*70}\n")

    # ── v1: original features, original target ───────
    print("  --- Training v1 (original features, target=2% in 10d) ---")
    v1 = MLModel()
    v1.feature_columns = FEATURE_COLUMNS
    master = v1._load_all_features()

    # Check if hybrid columns exist
    has_hybrid = "hybrid_target" in master.columns and "hybrid_signal" in master.columns
    if not has_hybrid:
        print("  ERROR: hybrid features not found. Run feature_engineer.py --force first.")
        return

    train1, test1 = v1._prepare_dataset(master, target_col="target")
    X_tr1 = train1[FEATURE_COLUMNS].values
    y_tr1 = train1["target"].values.astype(int)
    X_te1 = test1[FEATURE_COLUMNS].values
    y_te1 = test1["target"].values.astype(int)

    rf1 = RandomForestClassifier(
        n_estimators=500, max_depth=8, min_samples_leaf=50,
        max_features="sqrt", class_weight="balanced",
        random_state=42, n_jobs=-1,
    )
    rf1.fit(X_tr1, y_tr1)
    y_prob1 = rf1.predict_proba(X_te1)[:, 1]
    auc1 = roc_auc_score(y_te1, y_prob1)
    joblib.dump(rf1, MODEL_V1_PATH)
    print(f"  v1 saved to {MODEL_V1_PATH}")

    # ── v2: hybrid features, hybrid target ───────────
    print("\n  --- Training v2 (hybrid features, target=3% high in 20d) ---")
    v2 = MLModel()
    v2.feature_columns = HYBRID_FEATURE_COLUMNS

    train2, test2 = v2._prepare_dataset(master, target_col="hybrid_target")
    X_tr2 = train2[HYBRID_FEATURE_COLUMNS].values
    y_tr2 = train2["hybrid_target"].values.astype(int)
    X_te2 = test2[HYBRID_FEATURE_COLUMNS].values
    y_te2 = test2["hybrid_target"].values.astype(int)

    rf2 = RandomForestClassifier(
        n_estimators=500, max_depth=8, min_samples_leaf=50,
        max_features="sqrt", class_weight="balanced",
        random_state=42, n_jobs=-1,
    )
    rf2.fit(X_tr2, y_tr2)
    y_prob2 = rf2.predict_proba(X_te2)[:, 1]
    auc2 = roc_auc_score(y_te2, y_prob2)
    joblib.dump(rf2, MODEL_V2_PATH)
    print(f"  v2 saved to {MODEL_V2_PATH}")

    # ── Side-by-side comparison ──────────────────────
    thr = BUY_THRESHOLD

    def _stats(y_true, y_prob, future_ret=None):
        mask = y_prob >= thr
        n_sig = mask.sum()
        if n_sig > 0:
            prec = (y_true[mask] == 1).sum() / n_sig * 100
            wr = prec  # precision at threshold = win rate
        else:
            prec = wr = 0.0
        return n_sig, prec, wr

    n1, prec1, wr1 = _stats(y_te1, y_prob1)
    n2, prec2, wr2 = _stats(y_te2, y_prob2)

    w = 58
    eq = "=" * w
    ln = "-" * w
    print(f"\n  +{eq}+")
    print(f"  |{'MODEL COMPARISON':^{w}}|")
    print(f"  +{eq}+")
    print(f"  | {'Metric':<30} {'v1 (orig)':>12} {'v2 (hybrid)':>12} |")
    print(f"  +{ln}+")
    print(f"  | {'ROC-AUC':<30} {auc1:>12.4f} {auc2:>12.4f} |")
    print(f"  | {'Precision @ threshold':<30} {prec1:>11.1f}% {prec2:>11.1f}% |")
    print(f"  | {'Win rate @ threshold':<30} {wr1:>11.1f}% {wr2:>11.1f}% |")
    print(f"  | {'Signal count':<30} {n1:>12,} {n2:>12,} |")
    print(f"  | {'Features':<30} {len(FEATURE_COLUMNS):>12} {len(HYBRID_FEATURE_COLUMNS):>12} |")
    print(f"  | {'Target':<30} {'2% / 10d':>12} {'3% high/20d':>12} |")
    print(f"  +{eq}+")

    # ── Set active model ─────────────────────────────
    if auc2 >= auc1:
        winner = "v2_hybrid"
        print(f"\n  v2 wins (AUC {auc2:.4f} >= {auc1:.4f})")
        print("  Setting v2 as active model...")
        v2.model = rf2
        v2.feature_columns = HYBRID_FEATURE_COLUMNS
        joblib.dump(rf2, MODEL_PATH)
        joblib.dump(HYBRID_FEATURE_COLUMNS, FEATURE_COLS_PATH)
        v2._save_metadata(version="v2_hybrid")

        # Save v2 feature importance
        importances = pd.DataFrame({
            "feature": HYBRID_FEATURE_COLUMNS,
            "importance": rf2.feature_importances_,
        }).sort_values("importance", ascending=False)
        importances.to_csv(RESULTS_DIR / "feature_importance.csv", index=False)
    else:
        winner = "v1"
        print(f"\n  v1 wins (AUC {auc1:.4f} > {auc2:.4f})")
        print("  Keeping v1 as active model.")
        v1.model = rf1
        v1.feature_columns = FEATURE_COLUMNS
        joblib.dump(rf1, MODEL_PATH)
        joblib.dump(FEATURE_COLUMNS, FEATURE_COLS_PATH)
        v1._save_metadata(version="v1")

        importances = pd.DataFrame({
            "feature": FEATURE_COLUMNS,
            "importance": rf1.feature_importances_,
        }).sort_values("importance", ascending=False)
        importances.to_csv(RESULTS_DIR / "feature_importance.csv", index=False)

    print(f"  Active model: {winner}\n")
    return {"v1_auc": auc1, "v2_auc": auc2, "winner": winner}


if __name__ == "__main__":
    if "--compare" in sys.argv:
        compare_models()
    else:
        ml = MLModel()
        ml.train()

        # Top signals today
        print(f"\n{'='*70}")
        print("  TOP 5 HIGHEST-SCORING STOCKS (latest date)")
        print(f"{'='*70}")
        top = ml.top_signals_today(5)
        print(top.to_string(index=False))
        print()
