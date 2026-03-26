module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { ticker } = req.query
  if (!ticker) return res.json({ news: [], source: 'none' })

  const symbol = ticker.replace('.NS', '')

  // Source 1: Yahoo Finance search API
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}.NS&newsCount=6&enableFuzzyQuery=false`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    const data = await r.json()
    if (data.news && data.news.length > 0) {
      const news = data.news.slice(0, 5).map(n => ({
        title: n.title || '',
        link: n.link || '',
        source: n.publisher || 'Yahoo Finance',
        published: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : '',
        summary: (n.title || '').slice(0, 120),
      }))
      return res.json({ news, source: 'yahoo' })
    }
  } catch (e) {
    console.log('Yahoo failed:', e.message)
  }

  // Source 2: Yahoo quote summary (different endpoint)
  try {
    const r = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=5`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    )
    const data = await r.json()
    if (data.news && data.news.length > 0) {
      const news = data.news.slice(0, 5).map(n => ({
        title: n.title || '',
        link: n.link || '',
        source: n.publisher || 'Yahoo Finance',
        published: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : '',
        summary: (n.title || '').slice(0, 120),
      }))
      return res.json({ news, source: 'yahoo2' })
    }
  } catch (e) {
    console.log('Yahoo2 failed:', e.message)
  }

  return res.json({ news: [], source: 'none' })
}
