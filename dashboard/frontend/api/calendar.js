const handler = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  function lastThursday(year, month) {
    const d = new Date(year, month + 1, 0)
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  const events = [
    // RBI MPC 2026 schedule
    { date: '2026-04-07', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-06-05', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-08-07', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-10-02', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },
    { date: '2026-12-04', type: 'RBI', title: 'RBI MPC Decision', impact: 'HIGH' },

    // F&O expiries (compute surrounding months)
    ...[-1, 0, 1, 2, 3].map(offset => {
      const m = (currentMonth + offset + 12) % 12
      const y = currentYear + Math.floor((currentMonth + offset) / 12)
      return {
        date: lastThursday(y, m),
        type: 'EXPIRY',
        title: 'F&O Monthly Expiry',
        impact: 'MEDIUM'
      }
    }),

    // Results season
    { date: '2026-04-01', type: 'RESULTS', title: 'Q4 Results Season Begins', impact: 'HIGH' },
    { date: '2026-07-01', type: 'RESULTS', title: 'Q1 FY27 Results Begin', impact: 'MEDIUM' },
    { date: '2026-10-01', type: 'RESULTS', title: 'Q2 FY27 Results Begin', impact: 'MEDIUM' },

    // Budget
    { date: '2027-02-01', type: 'BUDGET', title: 'Union Budget 2027', impact: 'HIGH' },
  ]

  const upcoming = events
    .filter(e => new Date(e.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6)

  res.json({ events: upcoming })
}

module.exports = handler
