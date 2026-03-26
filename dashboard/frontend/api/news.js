export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) {
    return res.status(400).json({ news: [], error: 'Missing ticker param' })
  }

  const symbol = ticker.replace('.NS', '') + '.NS'

  // Try Yahoo Finance RSS feed
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=IN&lang=en-IN`
    const rssRes = await fetch(rssUrl, { headers: { 'User-Agent': 'NiftyQuant/1.0' }, signal: AbortSignal.timeout(8000) })

    if (rssRes.ok) {
      const xml = await rssRes.text()
      const items = parseRssItems(xml).slice(0, 4)
      if (items.length > 0) {
        return res.status(200).json({ news: items })
      }
    }
  } catch (_) { /* fall through */ }

  // Fallback: Yahoo Finance search API
  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0`
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'NiftyQuant/1.0' }, signal: AbortSignal.timeout(8000) })

    if (searchRes.ok) {
      const data = await searchRes.json()
      const items = (data.news || []).slice(0, 4).map(n => ({
        title: stripHtml(n.title || ''),
        link: n.link || '',
        published: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
        source: n.publisher || extractDomain(n.link || ''),
        summary: stripHtml(n.title || '').slice(0, 120),
      }))
      return res.status(200).json({ news: items })
    }
  } catch (_) { /* fall through */ }

  return res.status(200).json({ news: [] })
}

function parseRssItems(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const pubDate = extractTag(block, 'pubDate')
    const description = extractTag(block, 'description')
    if (title) {
      items.push({
        title: stripHtml(title),
        link: link || '',
        published: pubDate ? new Date(pubDate).toISOString() : '',
        source: extractDomain(link || ''),
        summary: stripHtml(description || '').slice(0, 120),
      })
    }
  }
  return items
}

function extractTag(xml, tag) {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))
  if (cdataMatch) return cdataMatch[1]
  const simpleMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return simpleMatch ? simpleMatch[1] : ''
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '').split('.').slice(-2, -1)[0] || hostname
  } catch {
    return 'Yahoo Finance'
  }
}
