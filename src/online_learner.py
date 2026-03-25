"""
Self-Improving Engine — Component 3: Online Learner
Rolling-window ML model that retrains weekly on
recent data, adapting to current market behaviour.
"""

import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_DIR, MODELS_DIR, RESULTS_DIR, NIFTY_500, BUY_THRESHOLD, ensure_dirs

ensure_dirs()

FEATURES_DIR = DATA_DIR / "features"
ONLINE_MODEL_PATH = MODELS_DIR / "rf_online.pkl"
ONLINE_STATE_PATH = MODELS_DIR / "online_state.json"
BASE_MODEL_PATH = MODELS_DIR / "rf_model.pkl"
BASE_COLS_PATH = MODELS_DIR / "feature_columns.pkl"

UPDATE_INTERVAL_DAYS = 7


class OnlineLearner:

    def __init__(self, feature_dir=None, model_dir=None, state_file=None):
        self.feature_dir = Path(feature_dir) if feature_dir else FEATURES_DIR
        self.model_dir = Path(model_dir) if model_dir else MODELS_DIR
        self.state_file = Path(state_file) if state_file else ONLINE_STATE_PATH
        self.online_model = None
        self.feature_columns = None
        self._load_feature_columns()

    def _load_feature_columns(self):
        """Load feature column list from base model."""
        if BASE_COLS_PATH.exists():
            self.feature_columns = joblib.load(BASE_COLS_PATH)
        else:
            from ml_model import HYBRID_FEATURE_COLUMNS
            self.feature_columns = HYBRID_FEATURE_COLUMNS

    def should_update(self):
        if not ONLINE_MODEL_PATH.exists():
            return True
        if not self.state_file.exists():
            return True
        try:
            with open(self.state_file) as f:
                state = json.load(f)
            last = datetime.fromisoformat(state["last_update"])
            return (datetime.now() - last).days >= UPDATE_INTERVAL_DAYS
        except Exception:
            return True

    def _load_rolling_data(self, lookback_days):
        """Load feature data for the rolling window."""
        frames = []
        for ticker in NIFTY_500:
            path = self.feature_dir / f"{ticker}.NS.csv"
            if not path.exists():
                continue
            df = pd.read_csv(path, index_col="Date", parse_dates=True)
            df["ticker"] = ticker
            frames.append(df)
        if not frames:
            return pd.DataFrame()
        master = pd.concat(frames)
        all_dates = master.index.unique().sort_values()
        cutoff = all_dates[-lookback_days] if len(all_dates) >= lookback_days else all_dates[0]
        return master[master.index >= cutoff]

    def update(self, lookback_days=120):
        """Retrain online model on rolling window."""
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import roc_auc_score

        print(f"  Loading rolling {lookback_days}-day window...")
        data = self._load_rolling_data(lookback_days)
        if data.empty or "hybrid_target" not in data.columns:
            print("  No data or missing hybrid_target. Skipping update.")
            return {"auc": 0, "using_online": False}

        # Filter usable rows
        df = data.dropna(subset=["hybrid_target"]).copy()
        available = [c for c in self.feature_columns if c in df.columns]
        if len(available) < len(self.feature_columns):
            missing = set(self.feature_columns) - set(available)
            print(f"  Missing features: {missing}. Skipping update.")
            return {"auc": 0, "using_online": False}

        df = df.dropna(subset=self.feature_columns)
        if len(df) < 500:
            print(f"  Only {len(df)} rows, need >= 500. Skipping.")
            return {"auc": 0, "using_online": False}

        # Split: last 20 trading days for test
        all_dates = df.index.unique().sort_values()
        test_cutoff = all_dates[-20] if len(all_dates) > 20 else all_dates[-5]
        train = df[df.index < test_cutoff]
        test = df[df.index >= test_cutoff]

        if len(train) < 200 or len(test) < 50:
            print(f"  Insufficient split: train={len(train)}, test={len(test)}.")
            return {"auc": 0, "using_online": False}

        X_train = train[self.feature_columns].values
        y_train = train["hybrid_target"].values.astype(int)
        X_test = test[self.feature_columns].values
        y_test = test["hybrid_target"].values.astype(int)

        print(f"  Training online model: {len(train):,} train, {len(test):,} test...")
        rf = RandomForestClassifier(
            n_estimators=300,
            max_depth=6,
            min_samples_leaf=30,
            max_features="sqrt",
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)

        y_prob = rf.predict_proba(X_test)[:, 1]
        online_auc = roc_auc_score(y_test, y_prob) if len(set(y_test)) > 1 else 0.5
        n_signals = (y_prob >= BUY_THRESHOLD).sum()

        print(f"  Online AUC: {online_auc:.4f} ({n_signals} signals at threshold)")

        # Compare with base model
        base_auc = 0.0
        if BASE_MODEL_PATH.exists():
            base_model = joblib.load(BASE_MODEL_PATH)
            base_cols = joblib.load(BASE_COLS_PATH) if BASE_COLS_PATH.exists() else self.feature_columns
            base_available = [c for c in base_cols if c in test.columns]
            if len(base_available) == len(base_cols):
                base_prob = base_model.predict_proba(test[base_cols].values)[:, 1]
                base_auc = roc_auc_score(y_test, base_prob) if len(set(y_test)) > 1 else 0.5
                print(f"  Base AUC:   {base_auc:.4f}")

        using_online = online_auc >= (base_auc - 0.02)

        # Save online model
        joblib.dump(rf, ONLINE_MODEL_PATH)
        self.online_model = rf

        # Load existing state to preserve n_updates
        n_updates = 0
        if self.state_file.exists():
            try:
                with open(self.state_file) as f:
                    old = json.load(f)
                n_updates = old.get("n_updates", 0)
            except Exception:
                pass
        n_updates += 1

        state = {
            "last_update": datetime.now().isoformat(),
            "window_days": lookback_days,
            "train_samples": len(train),
            "test_auc": round(online_auc, 4),
            "base_auc": round(base_auc, 4),
            "using_online": using_online,
            "n_updates": n_updates,
        }
        with open(self.state_file, "w") as f:
            json.dump(state, f, indent=2)

        status = "ACTIVE" if using_online else "FALLBACK to base"
        print(f"  Online model: {status}")

        return {"auc": online_auc, "base_auc": base_auc, "using_online": using_online, "n_updates": n_updates}

    def predict(self, features_df):
        """Score using best available model."""
        model, cols = self._get_active_model()
        available = [c for c in cols if c in features_df.columns]
        if len(available) < len(cols):
            return np.zeros(len(features_df))
        X = features_df[cols]
        valid = ~X.isna().any(axis=1)
        scores = np.zeros(len(features_df))
        if valid.any():
            scores[valid] = model.predict_proba(X[valid].values)[:, 1]
        return scores

    def _get_active_model(self):
        """Return (model, feature_columns) for the best available model."""
        # Try online first
        if ONLINE_MODEL_PATH.exists() and self.state_file.exists():
            try:
                with open(self.state_file) as f:
                    state = json.load(f)
                if state.get("using_online", False):
                    if self.online_model is None:
                        self.online_model = joblib.load(ONLINE_MODEL_PATH)
                    return self.online_model, self.feature_columns
            except Exception:
                pass
        # Fallback to base
        if BASE_MODEL_PATH.exists():
            model = joblib.load(BASE_MODEL_PATH)
            cols = joblib.load(BASE_COLS_PATH) if BASE_COLS_PATH.exists() else self.feature_columns
            return model, cols
        raise RuntimeError("No model available")

    def get_active_model_info(self):
        """Return status dict about active model."""
        if self.state_file.exists():
            try:
                with open(self.state_file) as f:
                    state = json.load(f)
                if state.get("using_online", False):
                    return {
                        "active_model": f"online_v{state.get('n_updates', '?')}",
                        "auc": state.get("test_auc", 0),
                        "last_update": state.get("last_update", "unknown"),
                        "window_days": state.get("window_days", 0),
                    }
            except Exception:
                pass
        return {"active_model": "base_v2", "auc": 0, "last_update": "N/A", "window_days": 0}


if __name__ == "__main__":
    print("=" * 60)
    print("  ONLINE LEARNER — TEST")
    print("=" * 60)

    learner = OnlineLearner()
    print(f"\n  Feature columns: {len(learner.feature_columns)}")
    print(f"  Should update: {learner.should_update()}")

    result = learner.update(lookback_days=120)
    print(f"\n  Result:")
    print(f"    Online AUC:    {result.get('auc', 0):.4f}")
    print(f"    Base AUC:      {result.get('base_auc', 0):.4f}")
    print(f"    Using online:  {result.get('using_online', False)}")
    print(f"    Update count:  {result.get('n_updates', 0)}")

    info = learner.get_active_model_info()
    print(f"\n  Active model: {info['active_model']} (AUC: {info['auc']:.4f})")
    print()
