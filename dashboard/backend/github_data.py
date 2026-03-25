"""Fetch result files from GitHub raw URLs instead of local filesystem."""

import io
import json
import requests

GITHUB_RAW = "https://raw.githubusercontent.com/kreeshpatel/niftyquant/main"


def fetch_github_file(path: str) -> str | None:
    """Fetch a file from the GitHub repo. Returns text content or None."""
    try:
        r = requests.get(f"{GITHUB_RAW}/{path}", timeout=10)
        if r.status_code == 200:
            return r.text
        return None
    except Exception:
        return None


def fetch_github_json(path: str) -> dict | None:
    """Fetch and parse a JSON file from GitHub."""
    text = fetch_github_file(path)
    if text is None:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def fetch_github_csv(path: str):
    """Fetch a CSV file from GitHub and return a pandas DataFrame, or None."""
    import pandas as pd
    text = fetch_github_file(path)
    if text is None:
        return None
    try:
        return pd.read_csv(io.StringIO(text))
    except Exception:
        return None
