import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Coven Documentation';
  const section = searchParams.get('section') ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#050409',
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(142,61,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(142,61,255,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial glow — offset left */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 60% at 25% 55%, rgba(142,61,255,0.13) 0%, transparent 65%)',
          }}
        />

        {/* Border frame */}
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            border: '1px solid rgba(142,61,255,0.18)',
            borderRadius: '16px',
          }}
        />

        {/* Left edge accent */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '3px',
            height: 'calc(100% - 40px)',
            background: '#8E3DFF',
            borderRadius: '3px 0 0 3px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 80px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Top: logo mark + wordmark + section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                background: 'rgba(142,61,255,0.12)',
                border: '1px solid rgba(142,61,255,0.25)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: '#C9A7FF',
              }}
            >
              ✦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#E8E0F0',
                  letterSpacing: '-0.3px',
                }}
              >
                Coven
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#C9A7FF',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                {section || 'Documentation'}
              </span>
            </div>
          </div>

          {/* Main title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                fontSize: title.length > 40 ? '44px' : '58px',
                fontWeight: 800,
                color: '#E8E0F0',
                lineHeight: 1.08,
                letterSpacing: '-2px',
                maxWidth: '860px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '18px',
                color: 'rgba(201,167,255,0.6)',
                fontWeight: 400,
                letterSpacing: '-0.2px',
              }}
            >
              Persistent AI familiars. Composable. Observable. Publishable.
            </div>
          </div>

          {/* Bottom: tags */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Open Source', 'Self-Hosted', 'Local Runtime'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '6px 14px',
                  border: '1px solid rgba(142,61,255,0.20)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'rgba(201,167,255,0.75)',
                  fontWeight: 600,
                  background: 'rgba(142,61,255,0.07)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
