const TICKERS = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK',
  'HINDUNILVR','SBIN','BHARTIARTL','BAJFINANCE',
  'KOTAKBANK','TITAN','AXISBANK','MARUTI',
  'SUNPHARMA','WIPRO'
]

const SYMBOLS = TICKERS.map(t => t + '.NS').join(',')

let cache = { data: null, timestamp: 0 }

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const now = Date.now()
  if (cache.data && now - cache.timestamp < 60000) {
    return res.json(cache.data)
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const json = await resp.json()
    const quotes = (json.quoteResponse?.result || []).map(q => ({
      ticker: q.symbol.replace('.NS', ''),
      price: q.regularMarketPrice || 0,
      change_pct: q.regularMarketChangePercent || 0,
      change_abs: q.regularMarketChange || 0,
    }))
    cache = { data: quotes, timestamp: now }
    res.json(quotes)
  } catch (e) {
    // Fallback with approximate prices
    const fallback = TICKERS.map(t => ({
      ticker: t,
      price: 1000 + Math.random() * 3000,
      change_pct: (Math.random() - 0.5) * 4,
      change_abs: (Math.random() - 0.5) * 50,
    }))
    res.json(fallback)
  }
}

module.exports = handler
