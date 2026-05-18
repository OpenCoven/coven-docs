import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center">
      {/* Logo mark */}
      <div style={{
        fontSize: '3rem',
        marginBottom: '1.5rem',
        filter: 'drop-shadow(0 0 20px rgba(154,142,205,0.4))',
      }}>
        ✦
      </div>

      <h1 style={{
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 700,
        letterSpacing: '-1.5px',
        marginBottom: '1rem',
        lineHeight: 1.1,
        background: 'linear-gradient(135deg, #fff 40%, #9A8ECD 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Coven Documentation
      </h1>

      <p style={{
        fontSize: '1.2rem',
        color: '#B0B0B0',
        maxWidth: '540px',
        lineHeight: 1.6,
        marginBottom: '2.5rem',
      }}>
        Persistent AI familiars. Composable. Observable. Publishable.<br />
        Build and summon agents that actually remember.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/docs" style={{
          background: 'linear-gradient(135deg, #9A8ECD, #7A6FB3)',
          color: '#fff',
          padding: '0.75rem 1.75rem',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '1rem',
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(154,142,205,0.3)',
          transition: 'all 0.2s',
        }}>
          Get Started →
        </Link>
        <Link href="https://github.com/OpenCoven/coven" style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(154,142,205,0.2)',
          color: '#E8E8E8',
          padding: '0.75rem 1.75rem',
          borderRadius: '8px',
          fontWeight: 500,
          fontSize: '1rem',
          textDecoration: 'none',
          backdropFilter: 'blur(8px)',
        }}>
          GitHub
        </Link>
      </div>

      {/* Feature pills */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '4rem',
      }}>
        {['Persistent familiars', 'Memory-aware', 'Tool access', 'Multi-channel', 'Open source'].map((f) => (
          <span key={f} style={{
            background: 'rgba(154,142,205,0.08)',
            border: '1px solid rgba(154,142,205,0.15)',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            fontSize: '0.875rem',
            color: '#B4AAEB',
          }}>
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}
