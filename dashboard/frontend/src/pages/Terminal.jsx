import React from 'react'
import IndexBar from '../components/terminal/IndexBar'
import MarketOverview from '../components/terminal/MarketOverview'
import SectorHeatmapMini from '../components/terminal/SectorHeatmapMini'
import PreMoveWidget from '../components/terminal/PreMoveWidget'
import PortfolioWidget from '../components/terminal/PortfolioWidget'
import WatchlistWidget from '../components/terminal/WatchlistWidget'
import NewsWidget from '../components/terminal/NewsWidget'

export default function Terminal() {
  return (
    <div className="anim-fade-up">
      {/* Index strip */}
      <IndexBar />

      {/* Bloomberg grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 8,
        marginTop: 8,
      }}>
        {/* Left column — 4 cols */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MarketOverview />
          <SectorHeatmapMini />
        </div>

        {/* Center column — 4 cols */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PreMoveWidget />
          <WatchlistWidget />
        </div>

        {/* Right column — 4 cols */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PortfolioWidget />
          <NewsWidget />
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: repeat(12"] {
            grid-template-columns: 1fr 1fr !important;
          }
          div[style*="gridColumn: span 4"] {
            grid-column: span 1 !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: repeat(12"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
