'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import s from './home.module.css';

const VIOLET = '#9A8ECD';
const VIOLET_DIM = 'rgba(154,142,205,0.15)';
const BORDER = '1px solid rgba(154,142,205,0.14)';

// ─── Types ────────────────────────────────────────────────────────────────────

type Feature = {
  icon: string;
  title: string;
  desc: string;
  href: string;
  tag?: string;
};

// ─── Stack + lifecycle data ───────────────────────────────────────────────────

const STACK_LAYERS = [
  {
    label: 'Surfaces',
    sub: 'CLI/TUI · comux · OpenMeow · OpenClaw',
    icon: 'ph:monitor-duotone',
    href: '/docs/familiars/clients',
    depth: 0,
    accent: true,
  },
  {
    label: 'Local API',
    sub: 'HTTP over Unix socket · /api/v1',
    icon: 'ph:plugs-connected-duotone',
    href: '/docs/reference/api',
    depth: 1,
    accent: false,
  },
  {
    label: 'Daemon',
    sub: 'Rust authority boundary',
    icon: 'ph:shield-check-duotone',
    href: '/docs/guide/architecture',
    depth: 2,
    accent: false,
  },
  {
    label: 'Ledger',
    sub: 'SQLite sessions + append-only events',
    icon: 'ph:database-duotone',
    href: '/docs/familiars/sessions',
    depth: 3,
    accent: false,
  },
  {
    label: 'Harnesses',
    sub: 'Codex · Claude Code · future adapters',
    icon: 'ph:plug-duotone',
    href: '/docs/familiars/harnesses',
    depth: 3,
    accent: false,
  },
  {
    label: 'PTY',
    sub: 'project roots · attach · replay · input',
    icon: 'ph:terminal-window-duotone',
    href: '/docs/familiars/sessions',
    depth: 4,
    accent: false,
  },
  {
    label: 'Familiar',
    sub: 'identity · memory · tool policy',
    icon: 'ph:brain-duotone',
    href: '/docs/guide/concepts',
    depth: 4,
    accent: false,
  },
  {
    label: 'Models',
    sub: 'provider-owned auth and execution',
    icon: 'ph:cpu-duotone',
    href: '/docs/reference/auth',
    depth: 5,
    accent: false,
  },
];

const LIFECYCLE_STEPS = [
  { icon: 'ph:chat-circle-duotone',  label: 'Message arrives',   via: 'Telegram · Discord · API' },
  { icon: 'ph:brain-duotone',        label: 'Memory loaded',     via: 'context + preferences' },
  { icon: 'ph:cpu-duotone',          label: 'Model called',      via: 'with memory + tools injected' },
  { icon: 'ph:wrench-duotone',       label: 'Tools execute',     via: 'web · exec · calendar' },
  { icon: 'ph:floppy-disk-duotone',  label: 'Memory updated',    via: 'decisions + context saved' },
  { icon: 'ph:paper-plane-duotone',  label: 'Reply delivered',   via: 'back to channel' },
];

// ─── Hero Terminal ─────────────────────────────────────────────────────────────

const TERMINAL_SCRIPT = [
  { kind: 'prompt', text: 'coven daemon start' },
  { kind: 'out',    text: '✓ daemon listening on local socket' },
  { kind: 'out',    text: '✓ project root verified' },
  { kind: 'muted',  text: '' },
  { kind: 'prompt', text: 'coven run codex "refactor auth module"' },
  { kind: 'out',    text: '→ session codex-7k2 created' },
  { kind: 'out',    text: '→ familiar memory loaded (42 entries)' },
  { kind: 'muted',  text: 'attach: coven attach codex-7k2' },
];

export function HeroTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= TERMINAL_SCRIPT.length) return;
    const delay = visibleCount === 0 ? 600 : TERMINAL_SCRIPT[visibleCount - 1].kind === 'prompt' ? 900 : 280;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <div className={s.heroTerminal} aria-hidden="true">
      {/* Title bar */}
      <div className={s.heroTerminalBar}>
        <span className={s.termDot} style={{ background: '#FF5F57' }} />
        <span className={s.termDot} style={{ background: '#FFBD2E' }} />
        <span className={s.termDot} style={{ background: '#28C840' }} />
        <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
          coven — zsh
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: '#6ECB8A',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          ● live
        </span>
      </div>

      {/* Body */}
      <div className={s.heroTerminalBody}>
        {TERMINAL_SCRIPT.slice(0, visibleCount).map((line, i) => (
          <div key={i} className={s.termLine} style={{ animationDelay: `0ms` }}>
            {line.kind === 'prompt' && (
              <span>
                <span className={s.termPrompt}>❯ </span>
                {line.text}
              </span>
            )}
            {line.kind === 'out'   && <span className={s.termOut}>{line.text}</span>}
            {line.kind === 'muted' && <span className={s.termMuted}>{line.text || '\u00a0'}</span>}
          </div>
        ))}
        {/* Blinking cursor while still typing */}
        {visibleCount < TERMINAL_SCRIPT.length && (
          <span className={s.cursor} />
        )}
        {/* Idle cursor at end */}
        {visibleCount >= TERMINAL_SCRIPT.length && (
          <div>
            <span className={s.termPrompt}>❯ </span>
            <span className={s.cursor} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature Grid ─────────────────────────────────────────────────────────────

export function FeatureGrid({ features }: { features: Feature[] }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className={s.fg}>
      {features.map((f) => (
        <Link
          key={f.title}
          href={f.href}
          className={s.fc}
          onMouseEnter={() => setActive(f.title)}
          onMouseLeave={() => setActive(null)}
          style={{
            padding: '1.75rem',
            background: active === f.title ? '#111118' : '#0C0C0F',
          }}
        >
          {/* Icon badge */}
          <div
            className={s.fcIconWrap}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: active === f.title ? 'rgba(154,142,205,0.22)' : VIOLET_DIM,
              border: `1px solid rgba(154,142,205,${active === f.title ? 0.35 : 0.22})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.1rem',
            }}
          >
            <Icon icon={f.icon} width={20} color={VIOLET} />
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#E8E8E8', letterSpacing: '-0.2px' }}>
              {f.title}
            </span>
            <span className={s.fcArrow}>
              <Icon icon="ph:arrow-right" width={14} color={VIOLET} />
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.84rem', color: '#8A8A8A', lineHeight: 1.65, margin: 0 }}>
            {f.desc}
          </p>

          {/* Tag */}
          {f.tag && <span className={s.fcTag}>{f.tag}</span>}
        </Link>
      ))}
    </div>
  );
}

// ─── Stack Diagram ─────────────────────────────────────────────────────────────

export function StackDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {STACK_LAYERS.map((row) => {
        const isHovered = hovered === row.label;
        const indent = row.depth * 14;
        const showConnector = row.depth > 0;

        return (
          <div key={row.label} style={{ marginLeft: `${indent}px`, position: 'relative' }}>
            {showConnector && (
              <div style={{
                position: 'absolute', left: '-13px', top: '0', bottom: '50%',
                width: '1px', background: 'rgba(154,142,205,0.2)',
              }} />
            )}
            {showConnector && (
              <div style={{
                position: 'absolute', left: '-13px', top: '50%',
                width: '12px', height: '1px', background: 'rgba(154,142,205,0.2)',
              }} />
            )}
            <Link
              href={row.href}
              className={s.stackRow}
              onMouseEnter={() => setHovered(row.label)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.58rem 0.78rem',
                marginBottom: '6px',
                background: row.accent
                  ? isHovered ? 'rgba(154,142,205,0.2)' : 'rgba(154,142,205,0.12)'
                  : isHovered ? 'rgba(154,142,205,0.1)' : VIOLET_DIM,
                border: `1px solid rgba(154,142,205,${row.accent ? 0.28 : 0.15})`,
                borderRadius: '8px',
              }}
            >
              <Icon icon={row.icon} width={15} color={isHovered ? VIOLET : 'rgba(154,142,205,0.7)'} />
              <span style={{
                fontWeight: row.accent ? 700 : 600,
                fontSize: '0.78rem',
                color: row.accent ? VIOLET : '#C0C0C0',
                minWidth: 72,
              }}>
                {row.label}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#666', flex: 1, lineHeight: 1.35 }}>{row.sub}</span>
              <Icon
                icon="ph:arrow-right"
                width={12}
                color={VIOLET}
                style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lifecycle Stepper ────────────────────────────────────────────────────────

const AUTOPLAY_DELAY = 1400; // ms per step when triggered by scroll

export function LifecycleStepper() {
  const [active, setActive] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intersection Observer — trigger auto-play once when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoPlaying) {
          setAutoPlaying(true);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoPlaying]);

  // Auto-advance when autoPlaying
  useEffect(() => {
    if (!autoPlaying) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        if (prev >= LIFECYCLE_STEPS.length - 1) {
          clearInterval(timerRef.current!);
          setAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, AUTOPLAY_DELAY);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlaying]);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAutoPlaying(false);
    setActive(0);
  };

  return (
    <div ref={sectionRef} style={{ display: 'flex', flexDirection: 'column' }}>
      {LIFECYCLE_STEPS.map((step, i) => {
        const isActive = active === i;
        const isDone = i < active;

        return (
          <button
            key={step.label}
            onClick={() => { reset(); setActive(i); }}
            className={`${s.lsStep}${isActive ? ` ${s.lsStepActive}` : ''}`}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.65rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {/* Step indicator + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isDone
                  ? 'rgba(110,203,138,0.15)'
                  : isActive ? VIOLET_DIM : 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  isDone ? 'rgba(110,203,138,0.4)'
                  : isActive ? 'rgba(154,142,205,0.45)'
                  : 'rgba(255,255,255,0.1)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.25s, border-color 0.25s',
                flexShrink: 0,
              }}>
                {isDone
                  ? <Icon icon="ph:check-bold" width={12} color="#6ECB8A" />
                  : <Icon icon={step.icon} width={13} color={isActive ? VIOLET : '#555'} />
                }
              </div>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <div style={{
                  width: '1px',
                  height: '10px',
                  background: isDone ? 'rgba(110,203,138,0.3)' : 'rgba(154,142,205,0.15)',
                  marginTop: '2px',
                  transition: 'background 0.25s',
                }} />
              )}
            </div>

            {/* Label + via */}
            <div style={{ flex: 1, paddingBottom: i < LIFECYCLE_STEPS.length - 1 ? '8px' : 0 }}>
              <div style={{
                fontSize: '0.83rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#E8E8E8' : isDone ? '#A0A0A0' : '#888',
                marginBottom: '0.1rem',
                transition: 'color 0.2s',
              }}>
                {step.label}
              </div>
              <div style={{
                fontSize: '0.76rem',
                color: isActive ? '#787878' : '#484848',
                transition: 'color 0.2s',
                lineHeight: 1.4,
              }}>
                {step.via}
              </div>
            </div>

            {/* Step number */}
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isActive ? VIOLET : '#444',
              letterSpacing: '0.05em',
              flexShrink: 0,
              transition: 'color 0.2s',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </button>
        );
      })}

      {/* Reset + replay hint */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.75rem' }}>
        <button
          onClick={reset}
          style={{
            all: 'unset',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: 'rgba(154,142,205,0.45)',
            cursor: 'pointer',
          }}
        >
          <Icon icon="ph:arrow-counter-clockwise" width={13} />
          Reset
        </button>
        {!autoPlaying && active === LIFECYCLE_STEPS.length - 1 && (
          <button
            onClick={() => { setActive(0); setAutoPlaying(true); }}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: VIOLET,
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            <Icon icon="ph:play-circle-duotone" width={14} />
            Replay
          </button>
        )}
      </div>
    </div>
  );
}
