import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';
import { OPENCOVEN_LOGO_PATH, OPENCOVEN_LOGO_SIZE } from '@/lib/opencoven-logo';

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
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage:
              'linear-gradient(rgba(142,61,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(142,61,255,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial glow — offset left */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background:
              'radial-gradient(ellipse 70% 60% at 25% 55%, rgba(142,61,255,0.13) 0%, transparent 65%)',
          }}
        />

        {/* Border frame */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px',
            border: '1px solid rgba(142,61,255,0.18)',
            borderRadius: '16px',
          }}
        />

        {/* Left edge accent */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            bottom: '20px',
            left: '20px',
            width: '3px',
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
            {/* The approved OpenCoven logo: white crown on a black square. */}
            <svg
              width="44"
              height="44"
              viewBox={`0 0 ${OPENCOVEN_LOGO_SIZE} ${OPENCOVEN_LOGO_SIZE}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{ borderRadius: '10px', boxShadow: '0 0 0 1px rgba(201,167,255,0.22)' }}
            >
              <rect width={OPENCOVEN_LOGO_SIZE} height={OPENCOVEN_LOGO_SIZE} fill="#000000" />
              <path d={OPENCOVEN_LOGO_PATH} fill="#ffffff" fillRule="evenodd" clipRule="evenodd" />
            </svg>
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
              Local runtime. Durable session record. Your harness.
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
