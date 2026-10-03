'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styles from './evidence-seal.module.css';

// The three properties the seal certifies, in ring order. Each sentence is
// drawn from the page it links to, so the caption never claims more than the
// docs do.
const PROPERTIES = [
  {
    word: 'LOCAL',
    title: 'Local',
    text: (
      <>
        Sessions run on this machine, inside the project root you choose. Clients reach the
        daemon over same-user local IPC, and provider credentials stay with each harness.
      </>
    ),
    href: '/docs/daemon/security',
    link: 'Security posture',
  },
  {
    word: 'DURABLE',
    title: 'Durable',
    text: (
      <>
        Every session becomes a record with its own event log. Archive and summon only change
        what you see; an explicit <code>coven sacrifice</code> is the one way to delete it.
      </>
    ),
    href: '/docs/cli/sessions',
    link: 'Session records',
  },
  {
    word: 'AUDITABLE',
    title: 'Auditable',
    text: (
      <>
        Each session keeps an ordered stream of output, input, status, and exit events, so you
        can replay what the harness did after it finishes.
      </>
    ),
    href: '/docs/daemon/observability',
    link: 'Observability',
  },
] as const;

const STEP = 360 / PROPERTIES.length;
const AUTO_ADVANCE_MS = 6000;

// 24 squares stepped 3.75° apart: their overlapping edges interfere into a
// guilloché rosette, the engraving used on certificates of authenticity. The
// set repeats every 3.75°, so it reads the same at any dial position.
const ROSETTE_TURNS = Array.from({ length: 24 }, (_, i) => i * 3.75);

const TEXT_RADIUS = 86;
const ARC_RADIUS = 78;
const SEGMENT_HALF_SPAN = 48; // degrees either side of a word's centre

function point(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return `${(radius * Math.sin(radians)).toFixed(3)} ${(-radius * Math.cos(radians)).toFixed(3)}`;
}

function arc(radius: number, from: number, to: number) {
  return `M ${point(radius, from)} A ${radius} ${radius} 0 0 1 ${point(radius, to)}`;
}

// Two clockwise laps from 12 o'clock, so every word can be centred on the
// second lap with room for its letters on both sides.
const LAP = 2 * Math.PI * TEXT_RADIUS;
const r = TEXT_RADIUS;
const TEXT_PATH = `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function EvidenceSeal({ className }: { className?: string }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [turns, setTurns] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(SVGGElement | null)[]>([]);

  function select(next: number) {
    const target = ((next % PROPERTIES.length) + PROPERTIES.length) % PROPERTIES.length;
    if (target === active) return;
    // Turn the shortest way round so the chosen word settles at the top.
    let delta = ((target - active) * STEP) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    setActive(target);
    setRotation((value) => value - delta);
    setTurns((value) => value + 1);
  }

  function choose(next: number) {
    setInteracted(true);
    select(next);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: PROPERTIES.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + PROPERTIES.length) % PROPERTIES.length;
    choose(next);
    tabRefs.current[next]?.focus();
  }

  // Only turn on its own while on screen.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Turn the dial on its own until the reader takes over.
  useEffect(() => {
    if (interacted || hovered || !visible || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') select(active + 1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [active, interacted, hovered, visible]);

  const tabId = (index: number) => `${id}-tab-${index}`;
  const panelId = `${id}-panel`;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <svg className={styles.svg} viewBox="-100 -100 200 200">
        <defs>
          <path id={`${id}-text`} d={TEXT_PATH} />
          <mask id={`${id}-glint`} maskUnits="userSpaceOnUse" x="-100" y="-100" width="200" height="200">
            {/* Re-keyed on every turn so the light sweeps the top again. */}
            <path
              key={turns}
              className={styles.glint}
              d={`M 0 0 L ${point(100, -16)} A 100 100 0 0 1 ${point(100, 16)} Z`}
              fill="white"
            />
          </mask>
        </defs>

        <g aria-hidden="true">
          <circle className={styles.ring} r="95" />
          <g className={styles.rosette}>
            {ROSETTE_TURNS.map((turn) => (
              <rect key={turn} x="-52" y="-52" width="104" height="104" transform={`rotate(${turn})`} />
            ))}
          </g>
          <g className={styles.rosetteLit} mask={`url(#${id}-glint)`}>
            {ROSETTE_TURNS.map((turn) => (
              <rect key={turn} x="-52" y="-52" width="104" height="104" transform={`rotate(${turn})`} />
            ))}
          </g>
          <circle className={styles.core} r="24" />
          <rect className={styles.diamond} x="-9" y="-9" width="18" height="18" transform="rotate(45)" />
          <circle className={styles.dot} r="2.5" />
          {/* Fixed index at 12 o'clock: the dial turns the active word under it. */}
          <path className={styles.index} d="M 0 -97 L -2.6 -101.5 L 2.6 -101.5 Z" />
        </g>

        <g className={styles.dial} style={{ transform: `rotate(${rotation}deg)` }}>
          <circle className={styles.ring} r={ARC_RADIUS} aria-hidden="true" />
          {PROPERTIES.map((_, index) => (
            <rect
              key={`sep-${index}`}
              className={styles.separator}
              aria-hidden="true"
              x="-1.6"
              y="-1.6"
              width="3.2"
              height="3.2"
              transform={`rotate(${index * STEP + STEP / 2}) translate(0 ${-TEXT_RADIUS}) rotate(45)`}
            />
          ))}
          <g role="tablist" aria-label="What Coven guarantees">
            {PROPERTIES.map((item, index) => {
              const centre = index * STEP;
              const selected = index === active;
              return (
                <g
                  key={item.word}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  role="tab"
                  id={tabId(index)}
                  aria-selected={selected}
                  aria-controls={panelId}
                  aria-label={item.title}
                  tabIndex={selected ? 0 : -1}
                  className={styles.tab}
                  data-active={selected}
                  onClick={() => choose(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                >
                  <path
                    className={styles.hit}
                    d={arc(TEXT_RADIUS - 3, centre - SEGMENT_HALF_SPAN, centre + SEGMENT_HALF_SPAN)}
                  />
                  <path
                    className={styles.segment}
                    d={arc(ARC_RADIUS, centre - SEGMENT_HALF_SPAN, centre + SEGMENT_HALF_SPAN)}
                  />
                  <text className={styles.word} aria-hidden="true">
                    <textPath href={`#${id}-text`} startOffset={(LAP * (1 + centre / 360)).toFixed(2)} textAnchor="middle">
                      {item.word}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className={styles.panel} role="tabpanel" id={panelId} aria-labelledby={tabId(active)}>
        {/* All three captions share one grid cell, so the panel keeps the
            height of the longest and the hero never jumps. Hidden ones are
            visibility: hidden, which also takes their links out of tab order. */}
        <div className={styles.stack}>
          {PROPERTIES.map((item, index) => (
            <div key={item.word} className={styles.panelBody} data-active={index === active}>
              <p className={styles.panelTitle}>{item.title}</p>
              <p className={styles.panelText}>{item.text}</p>
              <Link href={item.href} className={styles.panelLink}>
                {item.link}
                <Icon icon="ph:arrow-right" width={12} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
        <div className={styles.markers} aria-hidden="true">
          {PROPERTIES.map((item, index) => (
            <span
              key={item.word}
              className={styles.marker}
              data-active={index === active}
              onClick={() => choose(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
