import Link from 'next/link';
import { Icon } from '@iconify/react';
import { CopyButton } from './CopyButton';
import { BoundarySigil } from './BoundarySigil';
import { FeatureGrid, StackDiagram, LifecycleStepper, HeroTerminal } from './HomeInteractive';
import s from './home.module.css';

// ─── constants ───────────────────────────────────────────────────────────────

const features = [
  {
    title: 'Persistent Memory',
    desc: 'Familiars remember decisions, context, and preferences across sessions — not just this conversation.',
    href: '/docs/familiars/sessions',
    tag: 'memory',
  },
  {
    title: 'Tool Access',
    desc: 'Web search, exec, files, calendar, and messaging are first-class. The familiar uses them — not you.',
    href: '/docs/guide/concepts',
    tag: 'tools',
  },
  {
    title: 'Multi-Channel',
    desc: 'One familiar, everywhere. Telegram, Discord, iMessage, WhatsApp, and your own REST API.',
    href: '/docs/familiars/clients',
    tag: 'channels',
  },
  {
    title: 'Observable',
    desc: 'Every tool call, handoff, and decision is traced. You always know what your familiar did and why.',
    href: '/docs/guide/architecture',
    tag: 'tracing',
  },
  {
    title: 'Composable',
    desc: 'Familiars delegate to each other, spawn subagents, and hand off work using harness adapters.',
    href: '/docs/familiars/harnesses',
    tag: 'multi-agent',
  },
  {
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
    badge: 'rust',
    copy: 'crates/coven-cli',
  },
  {
    name: 'packages/openclaw-coven',
    desc: 'External OpenClaw bridge that talks to Coven through the daemon API.',
    badge: 'plugin',
    copy: 'packages/openclaw-coven',
  },
  {
    name: 'packages/cli',
    desc: 'npm wrapper that resolves and launches the native Coven binary.',
    badge: 'npm',
    copy: 'npm install @opencoven/cli',
  },
  {
    name: 'coven.daemon.v1',
    desc: 'Versioned HTTP-over-Unix-socket contract for local clients.',
    badge: 'api',
    copy: '/api/v1',
  },
  {
    name: 'coven.sqlite3',
    desc: 'Local session metadata and event ledger owned by the daemon.',
    badge: 'store',
    copy: 'coven.sqlite3',
  },
];

// ─── component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className={s.homeMain}>

      {/* ── Hero: thesis left, Boundary Sigil right ── */}
      <section className={s.heroPanel}>
        <div className={s.heroText}>
          <p className={s.heroEyebrow}>Substrate for persistent agents</p>

          <h1 className={s.heroTitle}>
            The boundary.
            <br />
            The record.
            <br />
            <span className={s.heroTitleAccent}>The continuity.</span>
          </h1>

          <p className={s.heroLead}>
            Coven is not a harness — it is the substrate harnesses run on.
            Named familiars with memory, identity, and tooling that survive
            across sessions. Bring Claude Code, Codex, or your own loop;
            Coven keeps the record.
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
        </div>

        <div className={s.heroSigil}>
          <BoundarySigil />
        </div>
      </section>

      {/* ── The record: editorial line + install, beside a live session ── */}
      <section className={s.introSection}>
        <div className={s.introText}>
          <p className={s.introCopy}>
            Every session a familiar runs is <span>recorded</span> and{' '}
            <span>replayable</span>. Memory, identity, and tool policy live in
            the substrate — so the familiar you name today is still itself
            next month, on a different harness.
          </p>

          <div className={s.installBar}>
            <div className={s.installBadge}>
              <Icon icon="ph:terminal-window-duotone" width={14} />
              npm
            </div>
            <div className={s.installCommand}>
              npm i -g @opencoven/cli
            </div>
            <Link href="/docs/guide/getting-started" className={s.installGuide}>
              Full guide <Icon icon="ph:arrow-right" width={12} />
            </Link>
          </div>
        </div>

        <HeroTerminal />
      </section>

      {/* ── Feature entries ── */}
      <section className={s.featureSection}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>A substrate, not a harness</h2>
          <p className={s.sectionLead}>
            Harnesses bring their own credentials, models, and provider
            accounts. Coven brings everything that should outlive them.
          </p>
        </div>
        <FeatureGrid features={features} />
      </section>

      {/* ── Architecture ── */}
      <section className={s.archSection}>
        <div className={s.archGrid}>

          <div className={s.archCard}>
            <div className={s.archCardHead}>
              <span className={s.cardEyebrow}>runtime stack</span>
              <div className={s.cardTitle}>From clients down to harnesses</div>
            </div>
            <StackDiagram />
          </div>

          <div className={s.archCard}>
            <div className={s.archCardHead}>
              <span className={s.cardEyebrow}>message lifecycle</span>
              <div className={s.cardTitle}>Click a step to trace the path</div>
            </div>
            <LifecycleStepper />
          </div>

        </div>
      </section>

      {/* ── Package register ── */}
      <section className={s.registerSection}>
        <div className={s.registerHead}>
          <div>
            <span className={s.cardEyebrow}>the register</span>
            <div className={s.cardTitle}>Current implementation pieces</div>
            <p className={s.registerLead}>
              Coven is a Rust runtime with a small local API, an npm launcher,
              and adaptable to external harness bridging.
            </p>
          </div>
          <div className={s.registerInstall}>
            npm install <span>@opencoven/cli</span>
          </div>
        </div>

        <div className={s.registerList}>
          {packages.map((pkg) => (
            <div key={pkg.name} className={s.registerRow}>
              <span className={s.registerTag}>[{pkg.badge}]</span>
              <div className={s.registerBody}>
                <div className={s.registerName}>{pkg.name}</div>
                <div className={s.registerDesc}>{pkg.desc}</div>
              </div>
              <CopyButton text={pkg.copy} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section className={s.ctaSection}>
        <h2 className={s.ctaTitle}>Name your first familiar.</h2>
        <p className={s.ctaLead}>
          Start with the guided setup, then drop into the API contract when
          you need the daemon surface.
        </p>
        <div className={s.ctaActions}>
          <Link href="/docs/guide/getting-started" className={s.ctaPrimary}>
            Read the docs
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
          <Link href="/docs/reference/api" className={s.ctaSecondary}>
            API Reference
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
        </div>
      </section>

    </main>
  );
}
