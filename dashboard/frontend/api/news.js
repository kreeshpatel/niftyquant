module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const { ticker } = req.query
  if (!ticker) return res.json({ news: [] })

  const nseSymbol = ticker.endsWith('.NS') ? ticker : `${ticker}.NS`

  // Yahoo Finance search API — only reliable free endpoint
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(nseSymbol)}&newsCount=8&enableFuzzyQuery=false&enableCb=false&enableNavLinks=false`
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': `https://finance.yahoo.com/quote/${nseSymbol}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (r.ok) {
      const data = await r.json()
      const raw = data?.news || []
      // Filter out generic PR Newswire / market research spam
      const spamPublishers = ['PR Newswire', 'GlobeNewswire', 'Business Wire', 'AccessWire', 'Newsfile']
      const filtered = raw.filter(n => {
        const pub = n.publisher || ''
        return !spamPublishers.some(s => pub.includes(s))
      })
      const items = (filtered.length > 0 ? filtered : raw).slice(0, 5)
      if (items.length > 0) {
        const news = items.map(n => ({
          title: n.title || '',
          link: n.link || '',
          source: n.publisher || 'Yahoo Finance',
          published: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
          summary: '',
        }))
        return res.json({ news, source: 'yahoo_search' })
      }
    }
  } catch (_) {}

  return res.json({
    news: [],
    source: 'none',
    fallback_url: `https://finance.yahoo.com/quote/${nseSymbol}/news`,
  })
}
