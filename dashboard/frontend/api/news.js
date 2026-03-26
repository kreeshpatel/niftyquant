const COMPANY_NAMES = {
  RELIANCE: 'Reliance Industries', TCS: 'Tata Consultancy', HDFCBANK: 'HDFC Bank',
  INFY: 'Infosys', ICICIBANK: 'ICICI Bank', HINDUNILVR: 'Hindustan Unilever',
  SBIN: 'State Bank India', BHARTIARTL: 'Bharti Airtel', KOTAKBANK: 'Kotak Mahindra',
  AXISBANK: 'Axis Bank', BAJFINANCE: 'Bajaj Finance', MARUTI: 'Maruti Suzuki',
  TITAN: 'Titan Company', SUNPHARMA: 'Sun Pharma', WIPRO: 'Wipro',
  AUROPHARMA: 'Aurobindo Pharma', ADANIGREEN: 'Adani Green', COALINDIA: 'Coal India',
  ONGC: 'ONGC', TATASTEEL: 'Tata Steel', TATAMOTORS: 'Tata Motors',
  HCLTECH: 'HCL Tech', TECHM: 'Tech Mahindra', LT: 'Larsen Toubro',
  BAJAJ_AUTO: 'Bajaj Auto', DRREDDY: 'Dr Reddy', CIPLA: 'Cipla',
  NESTLEIND: 'Nestle India', ITC: 'ITC', NTPC: 'NTPC', POWERGRID: 'Power Grid',
  ADANIPORTS: 'Adani Ports', JSWSTEEL: 'JSW Steel', HINDALCO: 'Hindalco',
  ULTRACEMCO: 'UltraTech Cement', BRITANNIA: 'Britannia', DIVISLAB: 'Divis Labs',
  EICHERMOT: 'Eicher Motors', HEROMOTOCO: 'Hero MotoCorp', INDUSINDBK: 'IndusInd Bank',
  TRENT: 'Trent', DLF: 'DLF', DMART: 'DMart', VEDL: 'Vedanta',
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store')

  const { ticker } = req.query
  if (!ticker) return res.json({ news: [] })

  const symbol = ticker.replace('.NS', '')
  const company = COMPANY_NAMES[symbol] || symbol

  // Method 1: Yahoo Finance search API (most reliable)
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol + '.NS')}&newsCount=8&enableFuzzyQuery=false&enableCb=false`
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (r.ok) {
      const data = await r.json()
      if (data.news && data.news.length > 0) {
        // Filter to relevant news — must mention ticker or company
        const companyLower = company.toLowerCase().split(' ')[0]
        const tickerLower = symbol.toLowerCase()
        const filtered = data.news.filter(n => {
          const text = (n.title || '').toLowerCase()
          return text.includes(tickerLower) || text.includes(companyLower)
        })
        const items = (filtered.length > 0 ? filtered : data.news).slice(0, 5)
        const news = items.map(n => ({
          title: n.title || '',
          link: n.link || '',
          source: n.publisher || 'Yahoo Finance',
          published: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
          summary: (n.title || '').slice(0, 120),
          thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
        }))
        return res.json({ news, source: 'yahoo' })
      }
    }
  } catch (_) {}

  // Method 2: Yahoo query2 fallback
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(company + ' stock')}&newsCount=6`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (r.ok) {
      const data = await r.json()
      if (data.news && data.news.length > 0) {
        const news = data.news.slice(0, 5).map(n => ({
          title: n.title || '',
          link: n.link || '',
          source: n.publisher || 'Yahoo Finance',
          published: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
          summary: (n.title || '').slice(0, 120),
        }))
        return res.json({ news, source: 'yahoo2' })
      }
    }
  } catch (_) {}

  return res.json({ news: [], source: 'none', message: `No recent news for ${company}` })
}
