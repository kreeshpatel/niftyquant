/**
 * Zerodha trading cost calculator for Indian equity delivery trades
 * All rates as of 2026 — update if Zerodha changes fee structure
 */

const RATES = {
  brokerage_pct: 0.03,       // 0.03% or ₹20 max per executed order
  brokerage_max: 20,         // ₹20 cap per leg
  stt_sell_pct: 0.1,         // 0.1% on sell side (delivery)
  exchange_pct: 0.00345,     // NSE transaction charges
  sebi_pct: 0.0001,          // SEBI turnover fee
  gst_pct: 18,               // 18% GST on brokerage + exchange charges
  stamp_buy_pct: 0.015,      // Stamp duty on buy side
  slippage_pct: 0.1,         // Estimated slippage per trade
}

/**
 * Calculate total round-trip cost for a delivery trade
 * @param {number} buyPrice - Entry price per share
 * @param {number} sellPrice - Exit price per share
 * @param {number} quantity - Number of shares
 * @returns {{ totalCost: number, costPct: number, breakdown: object }}
 */
export function calculateTradeCost(buyPrice, sellPrice, quantity) {
  const buyValue = buyPrice * quantity
  const sellValue = sellPrice * quantity
  const turnover = buyValue + sellValue

  // Brokerage: 0.03% or ₹20 max, per leg
  const buyBrokerage = Math.min(buyValue * RATES.brokerage_pct / 100, RATES.brokerage_max)
  const sellBrokerage = Math.min(sellValue * RATES.brokerage_pct / 100, RATES.brokerage_max)
  const totalBrokerage = buyBrokerage + sellBrokerage

  // STT: 0.1% on sell side only for delivery
  const stt = sellValue * RATES.stt_sell_pct / 100

  // Exchange transaction charges on both legs
  const exchangeCharges = turnover * RATES.exchange_pct / 100

  // SEBI charges on turnover
  const sebiCharges = turnover * RATES.sebi_pct / 100

  // GST: 18% on (brokerage + exchange charges)
  const gst = (totalBrokerage + exchangeCharges) * RATES.gst_pct / 100

  // Stamp duty: 0.015% on buy side
  const stampDuty = buyValue * RATES.stamp_buy_pct / 100

  // Slippage estimate
  const slippage = turnover * RATES.slippage_pct / 100

  const totalCost = totalBrokerage + stt + exchangeCharges + sebiCharges + gst + stampDuty + slippage
  const costPct = buyValue > 0 ? (totalCost / buyValue) * 100 : 0

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPct: Math.round(costPct * 1000) / 1000,
    breakdown: {
      brokerage: Math.round(totalBrokerage * 100) / 100,
      stt: Math.round(stt * 100) / 100,
      exchange: Math.round(exchangeCharges * 100) / 100,
      sebi: Math.round(sebiCharges * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      stampDuty: Math.round(stampDuty * 100) / 100,
      slippage: Math.round(slippage * 100) / 100,
    },
  }
}

/**
 * Estimate round-trip cost as a percentage of trade value
 * Quick version for backtest loops — avoids object allocation
 * @param {number} price - Approximate share price
 * @param {number} quantity - Number of shares (default 1, only matters for brokerage cap)
 * @returns {number} Cost as percentage of entry value (e.g. 0.35 means 0.35%)
 */
export function estimateCostPct(price = 500, quantity = 100) {
  const value = price * quantity
  const brokerage = Math.min(value * RATES.brokerage_pct / 100, RATES.brokerage_max) * 2
  const stt = value * RATES.stt_sell_pct / 100
  const exchange = value * 2 * RATES.exchange_pct / 100
  const sebi = value * 2 * RATES.sebi_pct / 100
  const gst = (brokerage + exchange) * RATES.gst_pct / 100
  const stamp = value * RATES.stamp_buy_pct / 100
  const slippage = value * 2 * RATES.slippage_pct / 100
  const total = brokerage + stt + exchange + sebi + gst + stamp + slippage
  return (total / value) * 100
}

export { RATES }
