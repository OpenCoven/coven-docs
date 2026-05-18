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
          background: '#000000',
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
              'linear-gradient(rgba(154,142,205,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(154,142,205,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 70% at 30% 50%, rgba(154,142,205,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Border frame */}
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            border: '1px solid rgba(154,142,205,0.2)',
            borderRadius: '16px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 72px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Top: logo + section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(154,142,205,0.15)',
                border: '1px solid rgba(154,142,205,0.3)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                color: '#9A8ECD',
              }}
            >
              ✦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: '-0.5px',
                }}
              >
                Coven
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: '#9A8ECD',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {section || 'Documentation'}
              </span>
            </div>
          </div>

          {/* Main title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.1,
                letterSpacing: '-2px',
                maxWidth: '820px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '20px',
                color: '#666',
                fontWeight: 400,
                letterSpacing: '-0.3px',
              }}
            >
              Persistent AI familiars. Composable. Observable. Publishable.
            </div>
          </div>

          {/* Bottom: tags */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Open Source', 'Self-Hosted', 'TypeScript'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '6px 14px',
                  border: '1px solid rgba(154,142,205,0.2)',
                  borderRadius: '999px',
                  fontSize: '13px',
                  color: '#9A8ECD',
                  fontWeight: 500,
                  background: 'rgba(154,142,205,0.06)',
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
