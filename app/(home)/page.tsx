import Link from 'next/link';
import { Icon } from '@iconify/react';

const features = [
  {
    icon: 'ph:brain-duotone',
    title: 'Persistent Memory',
    desc: 'Familiars remember context, decisions, and preferences across every session.',
  },
  {
    icon: 'ph:wrench-duotone',
    title: 'Tool Access',
    desc: 'Web search, exec, files, calendar, messaging — wired directly into the agent.',
  },
  {
    icon: 'ph:globe-duotone',
    title: 'Multi-Channel',
    desc: 'Telegram, Discord, iMessage, WhatsApp, API — one familiar, everywhere.',
  },
  {
    icon: 'ph:eye-duotone',
    title: 'Observable',
    desc: 'Every tool call, handoff, and decision is traced and inspectable.',
  },
  {
    icon: 'ph:git-merge-duotone',
    title: 'Composable',
    desc: 'Familiars delegate to each other, spawn subagents, and coordinate tasks.',
  },
  {
    icon: 'ph:rocket-launch-duotone',
    title: 'Publishable',
    desc: 'Ship familiar workflows as APIs, CLIs, apps, or integrations.',
  },
];

const stack = [
  { icon: 'ph:user-circle-duotone', label: 'Familiar', color: '#9A8ECD', desc: 'Persistent agent with memory + personality' },
  { icon: 'ph:circuit-board-duotone', label: 'Harness', color: '#7A6FB3', desc: 'AI provider (OpenClaw, Claude Code, Codex…)' },
  { icon: 'ph:plug-duotone', label: 'Tools', color: '#5D5499', desc: 'Web, exec, files, messaging, calendar…' },
  { icon: 'ph:chat-dots-duotone', label: 'Channels', color: '#3E3875', desc: 'Telegram, Discord, iMessage, API…' },
];

export default function HomePage() {
  return (
    <main style={{ width: '100%', overflowX: 'hidden' }}>

      {/* Hero */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '72vh',
        padding: '5rem 2rem 3rem',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(154,142,205,0.15) 0%, transparent 70%)',
      }}>
        <div style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 24px rgba(154,142,205,0.5))' }}>
          <Icon icon="ph:sparkle-duotone" width={56} color="#9A8ECD" />
        </div>

        <h1 style={{
          fontSize: 'clamp(2.8rem, 6vw, 5rem)',
          fontWeight: 800,
          letterSpacing: '-2px',
          lineHeight: 1.05,
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #fff 30%, #9A8ECD 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Summon your AI familiars.
        </h1>

        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
          color: '#A0A0A0',
          maxWidth: '580px',
          lineHeight: 1.65,
          marginBottom: '2.5rem',
        }}>
          Coven is the framework for persistent AI agents with memory, personality, and purpose. Build familiars that live in your workspace, know your context, and actually remember.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
          <Link href="/docs/guide/getting-started" style={{
            background: 'linear-gradient(135deg, #9A8ECD, #7A6FB3)',
            color: '#fff',
            padding: '0.85rem 2rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(154,142,205,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            Get Started
            <Icon icon="ph:arrow-right-bold" width={18} />
          </Link>
          <Link href="/docs/openapi/overview" style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(154,142,205,0.2)',
            color: '#E8E8E8',
            padding: '0.85rem 2rem',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '1rem',
            textDecoration: 'none',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Icon icon="ph:code-duotone" width={18} color="#9A8ECD" />
            API Reference
          </Link>
          <Link href="https://github.com/OpenCoven/coven" style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#A0A0A0',
            padding: '0.85rem 2rem',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '1rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Icon icon="ph:github-logo-duotone" width={18} />
            GitHub
          </Link>
        </div>

        {/* Layered architecture stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '480px' }}>
          {stack.map((s, i) => (
            <div key={s.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1.25rem',
              background: `rgba(${i === 0 ? '154,142,205' : i === 1 ? '122,111,179' : i === 2 ? '93,84,153' : '62,56,117'},0.12)`,
              border: `1px solid rgba(154,142,205,${0.15 - i * 0.03})`,
              borderRadius: '8px',
            }}>
              <Icon icon={s.icon} width={20} color={s.color} style={{ flexShrink: 0 }} />
              <span style={{ width: '80px', fontSize: '0.8rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{s.label}</span>
              <span style={{ fontSize: '0.875rem', color: '#888' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture diagram */}
      <section style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#E8E8E8' }}>How it works</h2>
        <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.95rem' }}>A familiar is a persistent agent bound to a harness, armed with tools, and present on every channel you care about.</p>

        <div style={{
          padding: '2rem',
          background: 'rgba(10,10,10,0.8)',
          border: '1px solid rgba(154,142,205,0.12)',
          borderRadius: '12px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: '#B4AAEB',
          lineHeight: 1.8,
          overflowX: 'auto',
        }}>
          <pre style={{ margin: 0, color: 'inherit', background: 'none' }}>{`
  You ──────────────► Telegram / Discord / iMessage / API
                              │
                              ▼
                     ┌─────────────────┐
                     │    Familiar     │  ← Memory + Personality
                     │   (Nova, Sage…) │
                     └────────┬────────┘
                              │  bound to
                              ▼
                     ┌─────────────────┐
                     │    Harness      │  ← AI provider adapter
                     │ (OpenClaw, etc) │
                     └────────┬────────┘
                              │  uses
                      ┌───────┴────────┐
                      ▼                ▼
               ┌────────────┐   ┌────────────┐
               │   Tools    │   │  Memory    │
               │ web/exec…  │   │  files     │
               └────────────┘   └────────────┘
`.trim()}</pre>
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#E8E8E8' }}>What makes Coven different</h2>
        <p style={{ color: '#888', marginBottom: '2.5rem', fontSize: '0.95rem' }}>Most AI agents are stateless. Coven familiars are not.</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: '1.5rem',
              background: 'rgba(20,20,20,0.6)',
              border: '1px solid rgba(154,142,205,0.1)',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <Icon icon={f.icon} width={28} color="#9A8ECD" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#E8E8E8' }}>{f.title}</div>
              <div style={{ fontSize: '0.875rem', color: '#777', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#E8E8E8' }}>Quick start</h2>
        <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.95rem' }}>A familiar in three lines.</p>
        <div style={{
          background: 'rgba(10,10,10,0.9)',
          border: '1px solid rgba(154,142,205,0.12)',
          borderRadius: '10px',
          padding: '1.5rem 2rem',
          fontFamily: 'Monaco, Courier New, monospace',
          fontSize: '0.9rem',
          lineHeight: 1.8,
          overflowX: 'auto',
        }}>
          <div style={{ color: '#555', marginBottom: '0.5rem' }}># Install</div>
          <div><span style={{ color: '#9A8ECD' }}>npm</span> <span style={{ color: '#E8E8E8' }}>install @opencoven/coven</span></div>
          <br />
          <div style={{ color: '#555', marginBottom: '0.5rem' }}># Spawn a familiar</div>
          <div><span style={{ color: '#7A6FB3' }}>const</span> <span style={{ color: '#B4AAEB' }}>nova</span> <span style={{ color: '#555' }}>=</span> <span style={{ color: '#9A8ECD' }}>await</span> <span style={{ color: '#E8E8E8' }}>coven.spawn({'{'}</span></div>
          <div style={{ paddingLeft: '2rem' }}><span style={{ color: '#B4AAEB' }}>name</span><span style={{ color: '#555' }}>:</span> <span style={{ color: '#7fba6c' }}>'Nova'</span><span style={{ color: '#555' }}>,</span></div>
          <div style={{ paddingLeft: '2rem' }}><span style={{ color: '#B4AAEB' }}>harness</span><span style={{ color: '#555' }}>:</span> <span style={{ color: '#7fba6c' }}>'openclaw'</span><span style={{ color: '#555' }}>,</span></div>
          <div style={{ paddingLeft: '2rem' }}><span style={{ color: '#B4AAEB' }}>tools</span><span style={{ color: '#555' }}>:</span> <span style={{ color: '#E8E8E8' }}>['web_search', 'exec', 'memory']</span></div>
          <div><span style={{ color: '#E8E8E8' }}>{'}'});</span></div>
          <br />
          <div><span style={{ color: '#9A8ECD' }}>await</span> <span style={{ color: '#B4AAEB' }}>nova</span><span style={{ color: '#555' }}>.</span><span style={{ color: '#E8E8E8' }}>chat(</span><span style={{ color: '#7fba6c' }}>"What's on my calendar today?"</span><span style={{ color: '#E8E8E8' }}>);</span></div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/docs/guide/getting-started" style={{ color: '#9A8ECD', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Full setup guide <Icon icon="ph:arrow-right" width={14} />
          </Link>
          <Link href="/docs/openapi/harnesses" style={{ color: '#7A6FB3', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Harness API <Icon icon="ph:arrow-right" width={14} />
          </Link>
          <Link href="https://discord.gg/opencoven" style={{ color: '#555', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Icon icon="ph:discord-logo-duotone" width={16} /> Join Discord
          </Link>
        </div>
      </section>

    </main>
  );
}
