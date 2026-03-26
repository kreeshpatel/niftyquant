"""
Project-wide configuration constants.
All phases import from this file.
"""

from pathlib import Path

# ── Directories ──────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
MODELS_DIR = BASE_DIR / "models"
RESULTS_DIR = BASE_DIR / "results"

ALL_DIRS = [DATA_DIR, LOGS_DIR, MODELS_DIR, RESULTS_DIR]

# ── Trading parameters ───────────────────────────────────
HOLD_DAYS = 10
BUY_THRESHOLD = 0.52
LOOKBACK_YEARS = 5

# ── Backtesting parameters ──────────────────────────────
INITIAL_CAPITAL = 1_000_000
MAX_POSITIONS = 20
MAX_POSITION_PCT = 0.15
BROKERAGE_PCT = 0.001
STT_PCT = 0.001
ATR_STOP_MULTIPLIER = 2.0
MIN_ADX = 25.0
MIN_HOLD_DAYS = 8

# ── Data-driven sector filters (from trade analysis) ───
BLOCKED_SECTORS = ['IT', 'FMCG', 'Auto']
PRIORITY_SECTORS = ['Infrastructure', 'Energy', 'Metals', 'Consumer']
WEAK_MONTHS = [7]  # July: 25.5% WR historically

# ── Tiered bear regime ─────────────────────────────────
BEAR_STRONG_BREADTH = 20
BEAR_MILD_BREADTH = 35
BEAR_MILD_SIZE_MULT = 0.6
BEAR_MILD_MAX_POS = 10
BEAR_MILD_ML_THRESH = 0.58

# ── Bear protection (market health) ────────────────────
HEALTH_SCORE_FULL = 45
HEALTH_SCORE_CAUTION = 25
HEALTH_SCORE_WARNING = 10
MAX_PORTFOLIO_HEAT = 15.0
USE_TRAILING_STOP = False        # disabled: cuts winners (-4.6pp per trade)
USE_HEALTH_SCORE_SIZING = False  # disabled: reduces profitable bull-year positions
USE_PORTFOLIO_HEAT = True        # enabled: prevents over-concentration
TRAILING_ACTIVATION = 2.5

# ── NSE market hours ─────────────────────────────────────
NSE_OPEN_TIME = "09:15"
NSE_CLOSE_TIME = "15:30"

# ── Nifty 500 tickers (381 unique, yfinance .NS verified) ─
NIFTY_500 = [
    "ADANIPORTS", "ADANIENT", "ADANIGREEN", "ADANIPOWER", "ADANIENSOL",
    "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO", "BAJFINANCE",
    "BAJAJFINSV", "BAJAJHLDNG", "BANKBARODA", "BEL", "BHARATFORG",
    "BHARTIARTL", "BHEL", "BIOCON", "BOSCHLTD", "BPCL",
    "BRITANNIA", "CANBK", "CHOLAFIN", "CIPLA", "COALINDIA",
    "COLPAL", "CONCOR", "CROMPTON", "CUB", "CUMMINSIND",
    "DABUR", "DIVISLAB", "DLF", "DRREDDY", "EICHERMOT",
    "ESCORTS", "EXIDEIND", "FEDERALBNK", "GAIL", "GLENMARK",
    "GMRAIRPORT", "GODREJCP", "GODREJPROP", "GRANULES", "GRASIM",
    "HCLTECH", "HDFCAMC", "HDFCBANK", "HDFCLIFE", "HEROMOTOCO",
    "HINDALCO", "HINDPETRO", "HINDUNILVR", "HONAUT", "ICICIBANK",
    "ICICIGI", "ICICIPRULI", "IDFCFIRSTB", "IEX", "IGL",
    "INDHOTEL", "INDIGO", "INDUSINDBK", "INDUSTOWER", "INFY",
    "IOC", "IPCALAB", "IRCTC", "ITC", "JINDALSTEL",
    "JKCEMENT", "JSL", "JSWSTEEL", "JUBLFOOD", "KOTAKBANK",
    "LALPATHLAB", "LAURUSLABS", "LICHSGFIN", "LT", "LTIM",
    "LTTS", "LUPIN", "M&M", "MARICO", "MARUTI",
    "MCDOWELL-N", "METROPOLIS", "MFSL", "MGL", "MOTHERSON",
    "MPHASIS", "MRF", "MUTHOOTFIN", "NATIONALUM", "NAUKRI",
    "NAVINFLUOR", "NESTLEIND", "NMDC", "NTPC", "OBEROIRLTY",
    "OFSS", "ONGC", "PAGEIND", "PEL", "PERSISTENT",
    "PETRONET", "PFC", "PIDILITIND", "PIIND", "PNB",
    "POLYCAB", "POWERGRID", "PVRINOX", "RAMCOCEM", "RECLTD",
    "RELIANCE", "SAIL", "SBICARD", "SBILIFE", "SBIN",
    "SHREECEM", "SIEMENS", "SRF", "SUNPHARMA", "SUNTV",
    "SUPREMEIND", "TATACOMM", "TATACONSUMER", "TATAELXSI",
    "TATAPOWER", "TATASTEEL", "TCS", "TECHM", "TITAN",
    "TORNTPHARM", "TORNTPOWER", "TRENT", "TVSMOTOR", "UBL",
    "ULTRACEMCO", "UNIONBANK", "UPL", "VEDL", "VOLTAS",
    "WHIRLPOOL", "WIPRO", "ZEEL", "ZOMATO", "ZYDUSLIFE",
    "ABBOTINDIA", "ABIRLANUVO", "ACC", "AFFLE", "AJANTPHARM",
    "ALKEM", "ALKYLAMINE", "ALOKINDS", "AMBUJACEM", "ANGELONE",
    "APLAPOLLO", "APTUS", "ARVINDFASN", "ATUL", "AUBANK",
    "AUROPHARMA", "AVALON", "AVANTIFEED", "AXISCADES", "BALRAMCHIN",
    "BALUARTE", "BANDHANBNK", "BATAINDIA", "BAYERCROP", "BERGEPAINT",
    "BIKAJI", "BLUESTARCO", "BRIGADE", "CANFINHOME", "CARBORUNIV",
    "CASTROLIND", "CEATLTD", "CENTURYTEX", "CERA", "CHALET",
    "CHAMBLFERT", "CLEAN", "COFORGE", "CRISIL", "DALBHARAT",
    "DATAPATTNS", "DEEPAKNTR", "DELTACORP", "DHANUKA", "DIXON",
    "DMART", "EASEMYTRIP", "ECLERX", "EIDPARRY", "ELGIEQUIP",
    "EMAMILTD", "ENDURANCE", "ENGINERSIN", "EQUITASBNK", "ESTER",
    "EVEREADY", "EXICOM", "FINCABLES", "FINPIPE", "FIVESTAR",
    "FORCEMOT", "FORTIS", "GALLANTT", "GHCL", "GLAXO",
    "GODREJIND", "GOKEX", "GPPL", "GRINDWELL", "GSFC",
    "GSPL", "GUJGASLTD", "HAPPSTMNDS", "HAVELLS", "HBLPOWER",
    "HFCL", "HIKAL", "HINDCOPPER", "HINDWAREAP", "HONASA",
    "HUDCO", "IBREALEST", "IDBI", "IFBIND", "IFCI",
    "IIFL", "IIFLSEC", "INDIAMART", "INDIANB", "INDIACEM",
    "INDIGOPNTS", "INDSWFTLAB", "INFIBEAM", "INTELLECT", "IONEXCHANG",
    "ISGEC", "JBCHEPHARM", "JBMA", "JMFINANCIL", "JSWENERGY",
    "JTEKTINDIA", "JUBILANT", "JUSTDIAL", "JYOTHYLAB", "KALPATPOWR",
    "KALYANKJIL", "KANSAINER", "KARURVYSYA", "KEC", "KFINTECH",
    "KIMS", "KIRLOSENG", "KIRLPNU", "KNRCON", "KOLTEPATIL",
    "KPIL", "KRBL", "KSCL", "LEMONTREE", "LICI",
    "LLOYDSENGG", "LOTUSCHOCO", "LUXIND", "MANAPPURAM", "MASFIN",
    "MASTEK", "MAXHEALTH", "MCX", "MEDPLUS", "METROBRAND",
    "MISHTANN", "MKCL", "MMTC", "MOIL",
    "MOTILALOFS", "MTAR", "NATCOPHARM", "NBCC", "NCC",
    "NESCO", "NETWORK18", "NEWGEN", "NILKAMAL", "NLCINDIA",
    "NOCIL", "NUVOCO", "OLECTRA", "OMAXE", "ONWARDTEC",
    "ORIENTCEM", "ORIENTELEC", "PAISALO", "PARADEEP", "PARAS",
    "PCJEWELLER", "PGHH", "PHOENIXLTD", "PNBHOUSING", "POLYMED",
    "POONAWALLA", "POWERMECH", "PRESTIGE", "PRINCEPIPE", "PRSMJOHNSN",
    "PURVA", "RADICO", "RAILTEL", "RAIN", "RAJRATAN",
    "RALLIS", "RATNAMANI", "RAYMOND", "RBA", "REDINGTON",
    "RELAXO", "RITES", "ROSSARI", "ROUTE", "SAFARI",
    "SAREGAMA", "SBFC", "SCHAEFFLER", "SEQUENT", "SHILPAMED",
    "SHOPERSTOP", "SHYAMMETL", "SKFINDIA", "SOBHA", "SOLARA",
    "SONACOMS", "SPANDANA", "SPARC", "STARHEALTH", "STYRENIX",
    "SUBROS", "SUMICHEM", "SUPRIYA", "SUVEN", "SUVENPHAR",
    "SUZLON", "TANLA", "TARSONS", "TASTYBITE", "TATACHEM",
    "TTML", "THYROCARE", "TIMKEN", "TINPLATE", "TITAGARH",
    "UCOBANK", "UJJIVANSFB", "UNOMINDA", "USHAMART", "VAIBHAVGBL",
    "VARROC", "VBL", "VIJAYA", "VINATIORGA", "VIP",
    "VIPIND", "VMART", "VSTIND", "WABAG", "WELCORP",
    "WELENT", "WESTLIFE", "YATHARTH", "ZENTEC", "ZFCVINDIA",
    "ZYDUSWELL",
]

# Backward compat alias
NIFTY_50 = NIFTY_500

# ── NSE holidays 2025 & 2026 ────────────────────────────
# Source: NSE official circulars
NSE_HOLIDAYS = {
    # 2025
    "2025-02-26",  # Mahashivratri
    "2025-03-14",  # Holi
    "2025-03-31",  # Id-Ul-Fitr (Ramadan)
    "2025-04-10",  # Shri Mahavir Jayanti
    "2025-04-14",  # Dr. Baba Saheb Ambedkar Jayanti
    "2025-04-18",  # Good Friday
    "2025-05-01",  # Maharashtra Day
    "2025-06-07",  # Bakri Id (Eid ul-Adha)
    "2025-08-15",  # Independence Day
    "2025-08-16",  # Ashura (Muharram)
    "2025-08-27",  # Ganesh Chaturthi
    "2025-10-02",  # Mahatma Gandhi Jayanti
    "2025-10-21",  # Dussehra
    "2025-10-22",  # Dussehra (additional)
    "2025-11-05",  # Diwali (Laxmi Pujan)
    "2025-11-26",  # Guru Nanak Jayanti
    "2025-12-25",  # Christmas
    # 2026
    "2026-01-26",  # Republic Day
    "2026-02-17",  # Mahashivratri
    "2026-03-03",  # Holi
    "2026-03-20",  # Id-Ul-Fitr (Ramadan)
    "2026-03-30",  # Shri Mahavir Jayanti
    "2026-04-03",  # Good Friday
    "2026-04-14",  # Dr. Baba Saheb Ambedkar Jayanti
    "2026-05-01",  # Maharashtra Day
    "2026-05-28",  # Bakri Id (Eid ul-Adha)
    "2026-06-26",  # Muharram
    "2026-08-15",  # Independence Day
    "2026-08-17",  # Ganesh Chaturthi
    "2026-09-04",  # Milad-un-Nabi (Prophet Mohammed Jayanti)
    "2026-10-02",  # Mahatma Gandhi Jayanti
    "2026-10-12",  # Dussehra
    "2026-10-26",  # Diwali (Laxmi Pujan)
    "2026-11-16",  # Guru Nanak Jayanti
    "2026-12-25",  # Christmas
}

# ── Regime parameters ───────────────────────────────────
REGIME_BEAR_BLOCK = True
REGIME_CHOPPY_STRICT = True
CHOPPY_THRESHOLD_BOOST = 0.05

# ── Circuit breaker ─────────────────────────────────────
CIRCUIT_BREAKER_DD = 0.08
CIRCUIT_BREAKER_DAYS = 5
CIRCUIT_BREAKER_RESET = 0.05

# ── Sector mapping ──────────────────────────────────────
SECTOR_MAP = {
    # Banking
    "HDFCBANK": "Banking", "ICICIBANK": "Banking", "SBIN": "Banking",
    "AXISBANK": "Banking", "KOTAKBANK": "Banking", "BANKBARODA": "Banking",
    "CANBK": "Banking", "PNB": "Banking", "FEDERALBNK": "Banking",
    "IDFCFIRSTB": "Banking", "INDUSINDBK": "Banking", "CUB": "Banking",
    "AUBANK": "Banking", "BANDHANBNK": "Banking", "KARURVYSYA": "Banking",
    "INDIANB": "Banking", "IDBI": "Banking", "UCOBANK": "Banking",
    "UNIONBANK": "Banking", "EQUITASBNK": "Banking", "UJJIVANSFB": "Banking",
    # IT
    "TCS": "IT", "INFY": "IT", "HCLTECH": "IT", "WIPRO": "IT",
    "TECHM": "IT", "LTIM": "IT", "LTTS": "IT", "MPHASIS": "IT",
    "PERSISTENT": "IT", "COFORGE": "IT", "HAPPSTMNDS": "IT",
    "OFSS": "IT", "NAUKRI": "IT", "TATAELXSI": "IT", "ECLERX": "IT",
    "MASTEK": "IT", "NEWGEN": "IT", "INTELLECT": "IT", "TANLA": "IT",
    "INDIAMART": "IT", "AFFLE": "IT",
    # Energy
    "RELIANCE": "Energy", "ONGC": "Energy", "BPCL": "Energy",
    "IOC": "Energy", "GAIL": "Energy", "PETRONET": "Energy",
    "HINDPETRO": "Energy", "ADANIENT": "Energy", "ADANIGREEN": "Energy",
    "ADANIPOWER": "Energy", "ADANIENSOL": "Energy", "ADANIPORTS": "Energy",
    "TATAPOWER": "Energy", "NTPC": "Energy", "POWERGRID": "Energy",
    "PFC": "Energy", "RECLTD": "Energy", "COALINDIA": "Energy",
    "JSWENERGY": "Energy", "IGL": "Energy", "MGL": "Energy",
    "GUJGASLTD": "Energy", "GSPL": "Energy",
    # Auto
    "MARUTI": "Auto", "M&M": "Auto", "BAJAJ-AUTO": "Auto",
    "TATAMOTORS": "Auto", "EICHERMOT": "Auto", "HEROMOTOCO": "Auto",
    "TVSMOTOR": "Auto", "ESCORTS": "Auto", "MOTHERSON": "Auto",
    "BOSCHLTD": "Auto", "EXIDEIND": "Auto", "ENDURANCE": "Auto",
    "VARROC": "Auto", "CEATLTD": "Auto", "MRF": "Auto",
    "UNOMINDA": "Auto",
    # FMCG
    "HINDUNILVR": "FMCG", "ITC": "FMCG", "NESTLEIND": "FMCG",
    "BRITANNIA": "FMCG", "DABUR": "FMCG", "MARICO": "FMCG",
    "GODREJCP": "FMCG", "COLPAL": "FMCG", "EMAMILTD": "FMCG",
    "TATACONSUM": "FMCG", "TATACONSUMER": "FMCG", "VBL": "FMCG",
    "UBL": "FMCG", "BIKAJI": "FMCG", "BATAINDIA": "FMCG",
    "PAGEIND": "FMCG", "RELAXO": "FMCG",
    # Pharma
    "SUNPHARMA": "Pharma", "DRREDDY": "Pharma", "CIPLA": "Pharma",
    "DIVISLAB": "Pharma", "LUPIN": "Pharma", "BIOCON": "Pharma",
    "AUROPHARMA": "Pharma", "TORNTPHARM": "Pharma", "ALKEM": "Pharma",
    "IPCALAB": "Pharma", "LALPATHLAB": "Pharma", "LAURUSLABS": "Pharma",
    "AJANTPHARM": "Pharma", "NATCOPHARM": "Pharma", "GRANULES": "Pharma",
    "GLENMARK": "Pharma", "ABBOTINDIA": "Pharma", "GLAXO": "Pharma",
    "METROPOLIS": "Pharma", "FORTIS": "Pharma", "MAXHEALTH": "Pharma",
    "KIMS": "Pharma", "APOLLOHOSP": "Pharma", "SPARC": "Pharma",
    "SUVENPHAR": "Pharma", "ZYDUSLIFE": "Pharma",
    # Finance_NBFC
    "BAJFINANCE": "Finance_NBFC", "BAJAJFINSV": "Finance_NBFC",
    "CHOLAFIN": "Finance_NBFC", "MUTHOOTFIN": "Finance_NBFC",
    "MANAPPURAM": "Finance_NBFC", "LICHSGFIN": "Finance_NBFC",
    "HDFCAMC": "Finance_NBFC", "ICICIGI": "Finance_NBFC",
    "ICICIPRULI": "Finance_NBFC", "SBILIFE": "Finance_NBFC",
    "SBICARD": "Finance_NBFC", "HDFCLIFE": "Finance_NBFC",
    "STARHEALTH": "Finance_NBFC", "BAJAJHLDNG": "Finance_NBFC",
    "MFSL": "Finance_NBFC", "ANGELONE": "Finance_NBFC",
    "MOTILALOFS": "Finance_NBFC", "CANFINHOME": "Finance_NBFC",
    "PNBHOUSING": "Finance_NBFC", "POONAWALLA": "Finance_NBFC",
    "LICI": "Finance_NBFC", "MCX": "Finance_NBFC",
    "KFINTECH": "Finance_NBFC",
    # Metals
    "TATASTEEL": "Metals", "JSWSTEEL": "Metals", "HINDALCO": "Metals",
    "VEDL": "Metals", "NMDC": "Metals", "SAIL": "Metals",
    "JINDALSTEL": "Metals", "JSL": "Metals", "NATIONALUM": "Metals",
    "HINDCOPPER": "Metals", "MOIL": "Metals", "COALINDIA": "Metals",
    # Cement
    "ULTRACEMCO": "Cement", "SHREECEM": "Cement", "ACC": "Cement",
    "AMBUJACEM": "Cement", "RAMCOCEM": "Cement", "DALBHARAT": "Cement",
    "JKCEMENT": "Cement", "NUVOCO": "Cement",
    # Telecom
    "BHARTIARTL": "Telecom", "INDUSTOWER": "Telecom", "TATACOMM": "Telecom",
    "TTML": "Telecom", "HFCL": "Telecom",
    # Infrastructure
    "LT": "Infrastructure", "GRASIM": "Infrastructure",
    "SIEMENS": "Infrastructure", "BEL": "Infrastructure",
    "BHARATFORG": "Infrastructure", "BHEL": "Infrastructure",
    "CONCOR": "Infrastructure", "GMRAIRPORT": "Infrastructure",
    "DLF": "Infrastructure", "GODREJPROP": "Infrastructure",
    "OBEROIRLTY": "Infrastructure", "PRESTIGE": "Infrastructure",
    "BRIGADE": "Infrastructure", "SOBHA": "Infrastructure",
    "IRCTC": "Infrastructure", "KEC": "Infrastructure",
    "KALPATPOWR": "Infrastructure", "TITAGARH": "Infrastructure",
    # Consumer
    "TITAN": "Consumer", "TRENT": "Consumer", "DMART": "Consumer",
    "JUBLFOOD": "Consumer", "PVRINOX": "Consumer", "INDIGO": "Consumer",
    "INDHOTEL": "Consumer", "CROMPTON": "Consumer", "VOLTAS": "Consumer",
    "HAVELLS": "Consumer", "POLYCAB": "Consumer", "DIXON": "Consumer",
    "WHIRLPOOL": "Consumer", "SAFARI": "Consumer",
    "KALYANKJIL": "Consumer", "METROBRAND": "Consumer",
    # Chemicals
    "PIDILITIND": "Chemicals", "SRF": "Chemicals", "NAVINFLUOR": "Chemicals",
    "PIIND": "Chemicals", "ATUL": "Chemicals", "DEEPAKNTR": "Chemicals",
    "ALKYLAMINE": "Chemicals", "CHAMBLFERT": "Chemicals",
    "VINATIORGA": "Chemicals", "SUMICHEM": "Chemicals",
    "RALLIS": "Chemicals", "GSFC": "Chemicals",
    # Realty
    "PURVA": "Realty", "KOLTEPATIL": "Realty", "IBREALEST": "Realty",
}

def get_sector(ticker: str) -> str:
    """Get sector for a ticker, defaulting to 'Others'."""
    return SECTOR_MAP.get(ticker, "Others")


def ensure_dirs():
    """Create all project directories if they don't exist."""
    for d in ALL_DIRS:
        d.mkdir(parents=True, exist_ok=True)
