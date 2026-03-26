const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  // This endpoint is a stub — the frontend uses local data from api.js
  // In production, this would fetch from GitHub or a data pipeline
  res.json({ message: 'Use client-side fetchScreener() for heatmap data' })
}

module.exports = handler
