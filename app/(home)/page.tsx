import Link from 'next/link';
import { Icon } from '@iconify/react';
import { CopyButton } from './CopyButton';
import { FeatureGrid, StackDiagram, LifecycleStepper, HeroTerminal } from './HomeInteractive';
import s from './home.module.css';

// ─── constants ───────────────────────────────────────────────────────────────

const VIOLET = '#9A8ECD';
const VIOLET_DIM = 'rgba(154,142,205,0.15)';
const BORDER = '1px solid rgba(154,142,205,0.14)';

const features = [
  {
    icon: 'ph:brain-duotone',
    title: 'Persistent Memory',
    desc: 'Familiars remember decisions, context, and preferences across sessions — not just this conversation.',
    href: '/docs/familiars/sessions',
    tag: 'memory',
  },
  {
    icon: 'ph:wrench-duotone',
    title: 'Tool Access',
    desc: 'Web search, exec, files, calendar, and messaging are first-class. The familiar uses them — not you.',
    href: '/docs/guide/concepts',
    tag: 'tools',
  },
  {
    icon: 'ph:globe-duotone',
    title: 'Multi-Channel',
    desc: 'One familiar, everywhere. Telegram, Discord, iMessage, WhatsApp, and your own REST API.',
    href: '/docs/familiars/clients',
    tag: 'channels',
  },
  {
    icon: 'ph:eye-duotone',
    title: 'Observable',
    desc: 'Every tool call, handoff, and decision is traced. You always know what your familiar did and why.',
    href: '/docs/guide/architecture',
    tag: 'tracing',
  },
  {
    icon: 'ph:git-merge-duotone',
    title: 'Composable',
    desc: 'Familiars delegate to each other, spawn subagents, and hand off work using harness adapters.',
    href: '/docs/familiars/harnesses',
    tag: 'multi-agent',
  },
  {
    icon: 'ph:rocket-launch-duotone',
    title: 'Publishable',
    desc: 'Package familiar workflows as APIs, CLIs, automations, or integrations your team can use.',
    href: '/docs/guide/getting-started',
    tag: 'deploy',
  },
];

const packages = [
  {
    name: 'crates/coven-cli',
    desc: 'Rust CLI, TUI, daemon, PTY supervision, and local socket API.',
    icon: 'ph:terminal-window-duotone',
    badge: 'rust',
    copy: 'crates/coven-cli',
  },
  {
    name: 'packages/openclaw-coven',
    desc: 'External OpenClaw bridge that talks to Coven through the daemon API.',
    icon: 'ph:plug-duotone',
    badge: 'plugin',
    copy: 'packages/openclaw-coven',
  },
  {
    name: 'packages/cli',
    desc: 'npm wrapper that resolves and launches the native Coven binary.',
    icon: 'ph:package-duotone',
    badge: 'npm',
    copy: 'npm install @opencoven/cli',
  },
  {
    name: 'coven.daemon.v1',
    desc: 'Versioned HTTP-over-Unix-socket contract for local clients.',
    icon: 'ph:plugs-connected-duotone',
    badge: 'api',
    copy: '/api/v1',
  },
  {
    name: 'coven.sqlite3',
    desc: 'Local session metadata and event ledger owned by the daemon.',
    icon: 'ph:database-duotone',
    badge: 'store',
    copy: 'coven.sqlite3',
  },
];

// ─── component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className={s.homeMain}>

      {/* ── Hero card ── */}
      <section className={s.heroPanel}>
        {/* Background grid lines */}
        <div className={s.heroGridBg} />

        {/* Animated terminal card — hidden on mobile via CSS */}
        <HeroTerminal />

        <p className={s.heroEyebrow}>
          The framework for persistent AI agents
        </p>

        <h1 className={s.heroTitle}>
          Summon Familiars that{' '}
          <span style={{ color: VIOLET }}>Recall</span>,{' '}
          <span style={{ color: VIOLET }}>Reason</span>,{' '}
          and{' '}
          <span style={{ color: VIOLET }}>React</span>.
        </h1>

        <p className={s.heroLead}>
          Coven is an open-source framework for persistent AI agents with memory, personality, and tool access. Not chatbots. Familiars.
        </p>

        <div className={s.heroActions}>
          <Link href="/docs/guide/getting-started" className={s.heroButtonPrimary}>
            Get Started
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
          <Link href="https://github.com/OpenCoven/coven" target="_blank" className={s.heroButtonSecondary}>
            <Icon icon="ph:github-logo-duotone" width={16} />
            GitHub
          </Link>
          <Link href="https://discord.gg/opencoven" target="_blank" className={s.heroButtonSecondary}>
            <Icon icon="ph:discord-logo-duotone" width={16} />
            Discord
          </Link>
        </div>
      </section>

      {/* ── Editorial tagline + Quick install ── */}
      <section className={s.introSection}>
        <p className={s.introCopy}>
          Coven gives your AI agents{' '}
          <span>persistent memory</span>,{' '}
          <span>distinct personality</span>, and{' '}
          <span>real tool access</span>{' '}
          — then puts them everywhere you work. Every agent is a{' '}
          <span>familiar</span>: named, remembered, and yours.
        </p>

        {/* Install bar — grouped tightly under the tagline */}
        <div className={s.installBar}>
          {/* Badge */}
          <div className={s.installBadge}>
            <Icon icon="ph:terminal-window-duotone" width={14} />
            npm
          </div>

          {/* Command */}
          <div className={s.installCommand}>
            create opencoven-app
          </div>

          {/* Guide link */}
          <Link href="/docs/guide/getting-started" className={s.installGuide}>
            Full guide <Icon icon="ph:arrow-right" width={12} />
          </Link>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '2rem 0.25rem 1.25rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: 0, marginBottom: '0.4rem' }}>
            Not just another AI wrapper.
          </h2>
          <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.55 }}>
            Coven is built around the idea that AI agents deserve an identity.
          </p>
        </div>
        <FeatureGrid features={features} />
      </section>

      {/* ── Architecture ── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div className={s.archGrid}>

          {/* Stack diagram */}
          <div style={{
            border: BORDER,
            borderRadius: '1.25rem',
            padding: '1.75rem',
            background: '#0A0A0E',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: VIOLET_DIM, border: `1px solid rgba(154,142,205,0.22)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon icon="ph:stack-duotone" width={16} color={VIOLET} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#E8E8E8', letterSpacing: 0 }}>The runtime stack</div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '1px' }}>Local-first layers, from clients to harnesses</div>
              </div>
            </div>
            <StackDiagram />
          </div>

          {/* Message lifecycle */}
          <div style={{
            border: BORDER,
            borderRadius: '1.25rem',
            padding: '1.75rem',
            background: '#0A0A0E',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: VIOLET_DIM, border: `1px solid rgba(154,142,205,0.22)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon icon="ph:arrows-clockwise-duotone" width={16} color={VIOLET} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#E8E8E8', letterSpacing: 0 }}>Message lifecycle</div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '1px' }}>Click a step to trace the path</div>
              </div>
            </div>
            <LifecycleStepper />
          </div>

        </div>
      </section>

      {/* ── Packages ── */}

      <section style={{
        border: BORDER,
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#0A0A0E',
        marginBottom: '1.5rem',
      }}>
        {/* Header row */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          borderBottom: BORDER,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Icon icon="ph:squares-four-duotone" width={20} color={VIOLET} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#E8E8E8', letterSpacing: 0 }}>Current implementation pieces</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#787878', margin: 0, lineHeight: 1.55 }}>
              Coven is a Rust runtime with a small local API, an npm launcher, and an external OpenClaw bridge.
            </p>
          </div>
          <div style={{
            fontFamily: 'Monaco, ui-monospace, monospace',
            fontSize: '0.78rem',
            color: '#888',
            background: 'rgba(255,255,255,0.04)',
            border: BORDER,
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
          }}>
            npm install <span style={{ color: VIOLET }}>@opencoven/cli</span>
          </div>
        </div>

        {/* Package list */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {packages.map((pkg, i) => (
            <div
              key={pkg.name}
              className={s.pkgCard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.85rem 1rem',
                border: BORDER,
                borderRadius: '10px',
                background: i === 0 ? 'rgba(154,142,205,0.07)' : 'transparent',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: VIOLET_DIM,
                border: `1px solid rgba(154,142,205,0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon icon={pkg.icon} width={17} color={VIOLET} />
              </div>

              {/* Name + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Monaco, ui-monospace, monospace', fontSize: '0.82rem', color: VIOLET, fontWeight: 600, marginBottom: '0.15rem' }}>
                  {pkg.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8A8A8A', lineHeight: 1.45 }}>{pkg.desc}</div>
              </div>

              {/* Badge */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'rgba(154,142,205,0.6)',
                background: VIOLET_DIM,
                border: `1px solid rgba(154,142,205,0.15)`,
                borderRadius: '999px',
                padding: '0.2rem 0.6rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {pkg.badge}
              </span>

              {/* Copy button — appears on hover via CSS */}
              <CopyButton text={pkg.copy} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section style={{
        position: 'relative',
        border: BORDER,
        borderRadius: '8px',
        padding: '4rem 2rem',
        overflow: 'hidden',
        background: '#0A0A0E',
        textAlign: 'center',
        marginBottom: '3rem',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '300px',
          background: 'radial-gradient(ellipse, rgba(154,142,205,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(154,142,205,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Kicker */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: VIOLET,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            border: `1px solid rgba(154,142,205,0.25)`,
            borderRadius: '999px',
            padding: '0.3rem 0.85rem',
            marginBottom: '1.75rem',
          }}>
            <Icon icon="ph:sparkle-duotone" width={12} />
            Open source · MIT licensed
          </div>

          <h2 style={{
            fontSize: '2.45rem',
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            marginBottom: '1rem',
            color: '#F0F0F0',
          }}>
            Ready to summon your familiar?
          </h2>

          <p style={{
            color: '#787878',
            marginBottom: '2.5rem',
            fontSize: '1rem',
            lineHeight: 1.6,
            maxWidth: '400px',
            margin: '0 auto 2.5rem',
          }}>
            Self-hosted, yours to fork, and built to grow with you.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            <Link
              href="/docs/guide/getting-started"
              className={s.ctaPrimary}
              style={{
                background: VIOLET,
                color: '#0A0A0A',
                padding: '0.85rem 2rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 0 28px rgba(154,142,205,0.3)',
              }}
            >
              Read the docs
              <Icon icon="ph:arrow-right-bold" width={14} />
            </Link>
            <Link
              href="/docs/openapi/overview"
              className={s.ctaSecondary}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: BORDER,
                color: '#C0C0C0',
                padding: '0.85rem 2rem',
                borderRadius: '999px',
                fontWeight: 500,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              API Reference
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { icon: 'ph:github-logo-duotone', label: 'GitHub', href: 'https://github.com/OpenCoven/coven' },
              { icon: 'ph:discord-logo-duotone', label: 'Discord', href: 'https://discord.gg/opencoven' },
              { icon: 'ph:lock-open-duotone', label: 'MIT License', href: 'https://github.com/OpenCoven/coven/blob/main/LICENSE' },
              { icon: 'ph:hard-drives-duotone', label: 'Self-hosted', href: '/docs/guide/getting-started' },
            ].map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className={s.trustPill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  color: '#666',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '999px',
                  padding: '0.35rem 0.85rem',
                  textDecoration: 'none',
                }}
              >
                <Icon icon={t.icon} width={13} color="#666" />
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
