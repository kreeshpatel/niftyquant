const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  // In production, these would be read from GitHub raw content or a data API.
  // For now, return structured placeholder that the frontend can display.
  const now = new Date().toISOString()

  try {
    // Try to fetch from GitHub raw (if results are committed)
    const baseUrl = 'https://raw.githubusercontent.com/kreeshpatel/niftyquant/main/results'
    const files = ['claude_decisions.json', 'claude_alerts.json', 'claude_trade_reviews.json', 'claude_strategy_advice.json']

    const results = {}
    for (const file of files) {
      try {
        const resp = await fetch(`${baseUrl}/${file}`)
        if (resp.ok) {
          results[file.replace('.json', '').replace('claude_', '')] = await resp.json()
        }
      } catch { /* skip missing files */ }
    }

    res.json({
      generated_at: now,
      decisions: results.decisions || [],
      alerts: results.alerts || { alerts: [] },
      trade_reviews: results.trade_reviews || [],
      strategy_advice: results.strategy_advice || null,
    })
  } catch {
    // Fallback with empty data
    res.json({
      generated_at: now,
      decisions: [],
      alerts: { alerts: [] },
      trade_reviews: [],
      strategy_advice: null,
    })
  }
}

module.exports = handler
