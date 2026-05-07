import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SmartVendr — Intelligent Point of Sale';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: 'white', lineHeight: 1 }}>SmartVendr</span>
            <span style={{ fontSize: 16, color: '#6ee7b7', letterSpacing: 4, textTransform: 'uppercase' }}>Smart Selling</span>
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'white', textAlign: 'center', maxWidth: 800, lineHeight: 1.3 }}>
          The intelligent point of sale for modern businesses
        </div>
        <div style={{ fontSize: 20, color: '#a7f3d0', marginTop: 20, textAlign: 'center', maxWidth: 600 }}>
          Real-time analytics · Offline-first · Multi-tenant SaaS
        </div>
      </div>
    ),
    { ...size }
  );
}
