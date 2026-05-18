import Link from 'next/link';
import { Icon } from '@iconify/react';
import { CopyButton } from './CopyButton';
import { FeatureGrid, StackDiagram, LifecycleStepper, HeroTerminal } from './HomeInteractive';
import s from './home.module.css';

// ─── constants ───────────────────────────────────────────────────────────────

// Brand violet stays hue-stable in both modes — used for accent icons that sit
// on tinted surfaces. Theme-aware text/background colors come from CSS vars
// defined in home.module.css.
const VIOLET = 'var(--home-violet)';
const VIOLET_TEXT = 'var(--home-violet-text)';
const VIOLET_DIM = 'var(--home-violet-soft)';
const BORDER = '1px solid var(--home-border)';

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
          Substrate Framework for Persistent Agents
        </p>

        <h1 className={s.heroTitle}>
          Familiars that{' '}
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
            Coven's a Substrate, not a Harness
          </h2>
          <p style={{ color: 'var(--home-fg-muted)', fontSize: '0.95rem', lineHeight: 1.55 }}>
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
            background: 'var(--home-surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: VIOLET_DIM, border: '1px solid var(--home-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon icon="ph:stack-duotone" width={16} color={VIOLET} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--home-fg)', letterSpacing: 0 }}>Runtime Stack</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--home-fg-subtle)', marginTop: '1px' }}>Local-first layers, from clients to harnesses</div>
              </div>
            </div>
            <StackDiagram />
          </div>

          {/* Message Lifecycle */}
          <div style={{
            border: BORDER,
            borderRadius: '1.25rem',
            padding: '1.75rem',
            background: 'var(--home-surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: VIOLET_DIM, border: '1px solid var(--home-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon icon="ph:arrows-clockwise-duotone" width={16} color={VIOLET} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--home-fg)', letterSpacing: 0 }}>Message Lifecycle</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--home-fg-subtle)', marginTop: '1px' }}>Click a step to trace the path</div>
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
        background: 'var(--home-surface)',
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
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--home-fg)', letterSpacing: 0 }}>Current implementation pieces</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--home-fg-subtle)', margin: 0, lineHeight: 1.55 }}>
              Coven is a Rust runtime with a small local API, an npm launcher, and adaptable to external harness bridging.
            </p>
          </div>
          <div style={{
            fontFamily: 'Monaco, ui-monospace, monospace',
            fontSize: '0.78rem',
            color: 'var(--home-fg-muted)',
            background: 'var(--home-surface-soft)',
            border: BORDER,
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
          }}>
            npm install <span style={{ color: VIOLET_TEXT }}>@opencoven/cli</span>
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
                background: i === 0 ? 'var(--home-violet-softer)' : 'transparent',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: VIOLET_DIM,
                border: '1px solid var(--home-border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon icon={pkg.icon} width={17} color={VIOLET} />
              </div>

              {/* Name + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Monaco, ui-monospace, monospace', fontSize: '0.82rem', color: VIOLET_TEXT, fontWeight: 600, marginBottom: '0.15rem' }}>
                  {pkg.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--home-fg-muted)', lineHeight: 1.45 }}>{pkg.desc}</div>
              </div>

              {/* Badge */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: VIOLET_TEXT,
                background: VIOLET_DIM,
                border: '1px solid var(--home-border)',
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
        borderTop: BORDER,
        padding: '3rem 0 3.5rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 650,
            letterSpacing: 0,
            lineHeight: 1.25,
            marginBottom: '0.65rem',
            color: 'var(--home-fg)',
          }}>
            Build your first Coven familiar.
          </h2>

          <p style={{
            color: 'var(--home-fg-muted)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            maxWidth: '460px',
            margin: '0 auto 1.4rem',
          }}>
            Start with the guided setup, then drop into the API contract when you need the daemon surface.
          </p>

          <div style={{ display: 'flex', gap: '1.1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/docs/guide/getting-started"
              className={s.ctaPrimary}
              style={{
                color: VIOLET_TEXT,
                fontWeight: 650,
                fontSize: '0.92rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              Read the docs
              <Icon icon="ph:arrow-right-bold" width={14} />
            </Link>
            <Link
              href="/docs/reference/api"
              className={s.ctaSecondary}
              style={{
                color: 'var(--home-fg-muted)',
                fontWeight: 500,
                fontSize: '0.92rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              API Reference
              <Icon icon="ph:arrow-right-bold" width={14} />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
