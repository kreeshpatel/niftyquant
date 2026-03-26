const Anthropic = require('@anthropic-ai/sdk')

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { regime, breadth, vix, rsi, adx,
          portfolio_value, win_rate } = req.query

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const prompt = `You are a quantitative analyst for NiftyQuant, an NSE algorithmic trading engine. Write a concise 2-sentence market commentary for today based on these conditions:

Market regime: ${regime || 'BEAR'}
Nifty breadth: ${breadth || '9.2'}% of stocks above EMA
India VIX: ${vix || '15.0'}
Nifty RSI: ${rsi || '33.9'}
Nifty ADX: ${adx || '28'}

Rules:
- Be specific and data-driven
- Reference the actual numbers
- End with what the engine is doing (entering/waiting/protecting capital)
- Max 50 words total
- Tone: professional, not alarmist
- No emojis`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    })

    res.json({
      commentary: message.content[0].text,
      generated_at: new Date().toISOString()
    })
  } catch (e) {
    res.json({
      commentary: `Market breadth at ${breadth || '9.2'}% with Nifty RSI ${rsi || '33.9'} signals ${regime || 'BEAR'} conditions. Engine maintaining ${(regime || 'BEAR') === 'BEAR' ? 'cash position' : 'selective entries'}.`,
      generated_at: new Date().toISOString(),
      fallback: true
    })
  }
}

module.exports = handler
