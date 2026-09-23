import { ImageResponse } from 'next/og'

export const alt = 'XP-Farm curated developer and AI links'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#101417',
        color: '#f4f7f5',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '72px',
        width: '100%',
      }}
    >
      <div style={{ color: '#7ee081', display: 'flex', fontSize: 28, fontWeight: 700 }}>
        XP-FARM
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
          Curated links for builders.
        </div>
        <div style={{ color: '#aab8b0', fontSize: 30 }}>
          Developer tools, AI agents, MCP resources, and open source.
        </div>
      </div>
    </div>
  )
}