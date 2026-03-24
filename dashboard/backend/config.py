"""
Backend-only config — self-contained constants for Railway deployment.
Does NOT import from project root config.py.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

RESULTS_DIR = os.getenv("RESULTS_DIR", os.path.join(PROJECT_ROOT, "results"))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(PROJECT_ROOT, "data"))
MODELS_DIR = os.getenv("MODELS_DIR", os.path.join(PROJECT_ROOT, "models"))
LOGS_DIR = os.getenv("LOGS_DIR", os.path.join(PROJECT_ROOT, "logs"))

INITIAL_CAPITAL = float(os.getenv("INITIAL_CAPITAL", "1000000"))
MAX_POSITIONS = int(os.getenv("MAX_POSITIONS", "20"))
BUY_THRESHOLD = float(os.getenv("BUY_THRESHOLD", "0.52"))
HOLD_DAYS = int(os.getenv("HOLD_DAYS", "10"))

SECTOR_MAP = {
    "HDFCBANK": "Banking", "ICICIBANK": "Banking", "SBIN": "Banking",
    "AXISBANK": "Banking", "KOTAKBANK": "Banking", "BANKBARODA": "Banking",
    "TCS": "IT", "INFY": "IT", "HCLTECH": "IT", "WIPRO": "IT",
    "TECHM": "IT", "LTIM": "IT", "PERSISTENT": "IT", "COFORGE": "IT",
    "RELIANCE": "Energy", "ONGC": "Energy", "BPCL": "Energy", "NTPC": "Energy",
    "MARUTI": "Auto", "M&M": "Auto", "BAJAJ-AUTO": "Auto", "TATAMOTORS": "Auto",
    "HINDUNILVR": "FMCG", "ITC": "FMCG", "NESTLEIND": "FMCG", "BRITANNIA": "FMCG",
    "SUNPHARMA": "Pharma", "DRREDDY": "Pharma", "CIPLA": "Pharma", "DIVISLAB": "Pharma",
    "BAJFINANCE": "Finance_NBFC", "CHOLAFIN": "Finance_NBFC", "SBILIFE": "Finance_NBFC",
    "TATASTEEL": "Metals", "JSWSTEEL": "Metals", "HINDALCO": "Metals",
    "BHARTIARTL": "Telecom", "LT": "Infrastructure", "TITAN": "Consumer",
}


def get_sector(ticker: str) -> str:
    return SECTOR_MAP.get(ticker, "Others")
