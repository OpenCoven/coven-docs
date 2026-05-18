import Link from 'next/link';
import { Icon } from '@iconify/react';

// ─── constants ───────────────────────────────────────────────────────────────

const VIOLET = '#9A8ECD';
const VIOLET_DIM = 'rgba(154,142,205,0.15)';
const BORDER = '1px solid rgba(154,142,205,0.14)';

const features = [
  {
    icon: 'ph:brain-duotone',
    title: 'Persistent Memory',
    desc: 'Familiars remember decisions, context, and preferences across sessions — not just this conversation.',
  },
  {
    icon: 'ph:wrench-duotone',
    title: 'Tool Access',
    desc: 'Web search, exec, files, calendar, and messaging are first-class. The familiar uses them — not you.',
  },
  {
    icon: 'ph:globe-duotone',
    title: 'Multi-Channel',
    desc: 'One familiar, everywhere. Telegram, Discord, iMessage, WhatsApp, and your own REST API.',
  },
  {
    icon: 'ph:eye-duotone',
    title: 'Observable',
    desc: 'Every tool call, handoff, and decision is traced. You always know what your familiar did and why.',
  },
  {
    icon: 'ph:git-merge-duotone',
    title: 'Composable',
    desc: 'Familiars delegate to each other, spawn subagents, and hand off work using harness adapters.',
  },
  {
    icon: 'ph:rocket-launch-duotone',
    title: 'Publishable',
    desc: 'Package familiar workflows as APIs, CLIs, automations, or integrations your team can use.',
  },
];

const packages = [
  { name: '@opencoven/coven', desc: 'Core orchestration runtime' },
  { name: '@opencoven/harness', desc: 'AI provider adapter layer' },
  { name: '@opencoven/memory', desc: 'Persistent memory + vector store' },
  { name: '@opencoven/tools', desc: 'Tool definitions and execution' },
  { name: '@opencoven/channels', desc: 'Channel bindings (Telegram, Discord…)' },
];

// ─── component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main style={{
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '1.5rem',
      color: '#E8E8E8',
    }}>

      {/* ── Hero card ── */}
      <section style={{
        position: 'relative',
        minHeight: '600px',
        height: '70vh',
        maxHeight: '900px',
        border: BORDER,
        borderRadius: '1.25rem',
        overflow: 'hidden',
        background: `radial-gradient(ellipse 100% 80% at 60% 50%, rgba(154,142,205,0.1) 0%, transparent 70%), #0A0A0A`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        marginBottom: '1.5rem',
      }}>
        {/* Background grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: 'linear-gradient(rgba(154,142,205,1) 1px, transparent 1px), linear-gradient(90deg, rgba(154,142,205,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        <p style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: VIOLET,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0.35rem 0.75rem',
          border: `1px solid rgba(154,142,205,0.3)`,
          borderRadius: '999px',
          width: 'fit-content',
          marginBottom: '1.75rem',
        }}>
          The framework for persistent AI agents
        </p>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          fontWeight: 700,
          letterSpacing: '-2px',
          lineHeight: 1.05,
          marginBottom: '1.5rem',
          maxWidth: '800px',
        }}>
          Build AI familiars that{' '}
          <span style={{ color: VIOLET }}>remember</span>,{' '}
          <span style={{ color: VIOLET }}>reason</span>,{' '}
          and{' '}
          <span style={{ color: VIOLET }}>act</span>.
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: '#888',
          maxWidth: '560px',
          lineHeight: 1.65,
          marginBottom: '2.5rem',
        }}>
          Coven is an open-source framework for persistent AI agents with memory, personality, and tool access. Not chatbots. Familiars.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/docs/guide/getting-started" style={{
            background: VIOLET,
            color: '#0A0A0A',
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            Get Started
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
          <Link href="https://github.com/OpenCoven/coven" target="_blank" style={{
            background: 'rgba(255,255,255,0.05)',
            border: BORDER,
            color: '#B0B0B0',
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '0.9rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <Icon icon="ph:github-logo-duotone" width={16} />
            GitHub
          </Link>
          <Link href="https://discord.gg/opencoven" target="_blank" style={{
            background: 'rgba(255,255,255,0.05)',
            border: BORDER,
            color: '#B0B0B0',
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '0.9rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <Icon icon="ph:discord-logo-duotone" width={16} />
            Discord
          </Link>
        </div>
      </section>

      {/* ── Editorial tagline ── */}
      <section style={{ padding: '3rem 1.5rem', maxWidth: '900px' }}>
        <p style={{
          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
          fontWeight: 300,
          lineHeight: 1.5,
          color: '#A0A0A0',
          letterSpacing: '-0.5px',
        }}>
          Coven gives your AI agents{' '}
          <span style={{ color: '#E8E8E8', fontWeight: 500 }}>persistent memory</span>,{' '}
          <span style={{ color: '#E8E8E8', fontWeight: 500 }}>distinct personality</span>, and{' '}
          <span style={{ color: '#E8E8E8', fontWeight: 500 }}>real tool access</span> — then puts them everywhere you work. Every agent is a{' '}
          <span style={{ color: VIOLET, fontWeight: 600 }}>familiar</span>: named, remembered, and yours.
        </p>
      </section>

      {/* ── Quick install ── */}
      <section style={{
        padding: '1.5rem',
        border: BORDER,
        borderRadius: '1.25rem',
        background: '#0A0A0A',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          border: `1px solid rgba(154,142,205,0.3)`,
          borderRadius: '8px',
          fontFamily: 'Monaco, monospace',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: VIOLET,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <Icon icon="ph:terminal-duotone" width={16} />
          Try it
        </div>
        <div style={{
          flex: 1,
          fontFamily: 'Monaco, Courier New, monospace',
          fontSize: '0.9rem',
          color: '#E8E8E8',
          background: 'rgba(255,255,255,0.03)',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
          minWidth: '240px',
        }}>
          <span style={{ color: '#9A8ECD' }}>npm</span> create opencoven-app
        </div>
        <Link href="/docs/guide/getting-started" style={{
          color: VIOLET,
          fontSize: '0.85rem',
          textDecoration: 'none',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          flexShrink: 0,
        }}>
          Full guide <Icon icon="ph:arrow-right" width={13} />
        </Link>
      </section>

      {/* ── Feature grid ── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{
          padding: '2rem 1.5rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '0.4rem' }}>
              Not just another AI wrapper.
            </h2>
            <p style={{ color: '#777', fontSize: '0.95rem' }}>
              Coven is built around the idea that AI agents deserve an identity.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1px',
          border: BORDER,
          borderRadius: '1.25rem',
          overflow: 'hidden',
          background: 'rgba(154,142,205,0.07)',
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: '1.75rem',
              background: '#0C0C0C',
              transition: 'background 0.2s',
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <Icon icon={f.icon} width={26} color={VIOLET} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem', color: '#E8E8E8', letterSpacing: '-0.2px' }}>
                {f.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Stack diagram */}
        <div style={{
          border: BORDER,
          borderRadius: '1.25rem',
          padding: '2rem',
          background: '#0A0A0A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Icon icon="ph:tree-structure-duotone" width={20} color={VIOLET} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>The stack</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Familiar', sub: 'Memory + Personality + Channels', depth: 0 },
              { label: 'Harness', sub: 'AI provider adapter', depth: 1 },
              { label: 'Tools', sub: 'web_search / exec / files…', depth: 2 },
              { label: 'Model', sub: 'GPT-5 / Claude / custom', depth: 2 },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.9rem',
                marginLeft: `${row.depth * 16}px`,
                background: VIOLET_DIM,
                border: `1px solid rgba(154,142,205,${0.15 - row.depth * 0.03})`,
                borderRadius: '6px',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: VIOLET, minWidth: 68 }}>{row.label}</span>
                <span style={{ fontSize: '0.78rem', color: '#666' }}>{row.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Message flow */}
        <div style={{
          border: BORDER,
          borderRadius: '1.25rem',
          padding: '2rem',
          background: '#0A0A0A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Icon icon="ph:arrows-clockwise-duotone" width={20} color={VIOLET} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Message lifecycle</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { step: '1', label: 'User sends message', via: 'Telegram / Discord / API' },
              { step: '2', label: 'Familiar loads memory', via: 'context + preferences' },
              { step: '3', label: 'Harness calls model', via: 'with memory + tools' },
              { step: '4', label: 'Tools execute', via: 'web / exec / calendar' },
              { step: '5', label: 'Memory updated', via: 'decisions + context saved' },
              { step: '6', label: 'Reply delivered', via: 'back to channel' },
            ].map((row) => (
              <div key={row.step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                <span style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: VIOLET_DIM,
                  border: `1px solid rgba(154,142,205,0.3)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: VIOLET,
                  flexShrink: 0,
                }}>
                  {row.step}
                </span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D0D0D0' }}>{row.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>{row.via}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ── */}
      <section style={{
        border: BORDER,
        borderRadius: '1.25rem',
        padding: '2rem',
        background: '#0A0A0A',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Icon icon="ph:package-duotone" width={20} color={VIOLET} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Composable by design</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {packages.map((pkg) => (
            <div key={pkg.name} style={{
              padding: '0.9rem 1rem',
              border: BORDER,
              borderRadius: '8px',
              background: VIOLET_DIM,
            }}>
              <div style={{ fontFamily: 'Monaco, monospace', fontSize: '0.8rem', color: VIOLET, fontWeight: 600, marginBottom: '0.3rem' }}>{pkg.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{pkg.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section style={{
        border: BORDER,
        borderRadius: '1.25rem',
        padding: '3rem',
        background: `radial-gradient(ellipse 80% 80% at 50% 100%, rgba(154,142,205,0.08) 0%, transparent 70%), #0A0A0A`,
        textAlign: 'center',
        marginBottom: '3rem',
      }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-1px', marginBottom: '0.75rem' }}>
          Ready to summon your familiar?
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Open source. Self-hosted. Yours.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/docs/guide/getting-started" style={{
            background: VIOLET,
            color: '#0A0A0A',
            padding: '0.75rem 1.75rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            Read the docs
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
          <Link href="/docs/openapi/overview" style={{
            background: 'rgba(255,255,255,0.04)',
            border: BORDER,
            color: '#B0B0B0',
            padding: '0.75rem 1.75rem',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}>
            API Reference
          </Link>
        </div>
      </section>

    </main>
  );
}
