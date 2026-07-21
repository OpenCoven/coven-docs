import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import s from '../home.module.css';

export const metadata: Metadata = {
  title: 'Covenant',
  description: 'The operating promises behind Coven.',
};

const covenantPoints = [
  {
    title: 'Local-first trust',
    icon: 'ph:shield-check-duotone',
    desc: 'Coven keeps authority close to the machine, the workspace, and the person running it.',
  },
  {
    title: 'Observable action',
    icon: 'ph:eye-duotone',
    desc: 'Tool use, handoffs, and session state should be inspectable instead of mysterious.',
  },
  {
    title: 'Reversible by default',
    icon: 'ph:arrow-counter-clockwise-duotone',
    desc: 'Archive before destructive cleanup, preserve records, and gate irreversible choices.',
  },
];

export default function CovenantPage() {
  return (
    <main className={s.homeMain}>
      <section className={`${s.heroPanel} ${s.heroPanelSolo}`}>
        <div className={s.heroGridBg} />
        <p className={s.heroEyebrow}>Working Promises</p>
        <h1 className={s.heroTitle}>Covenant</h1>
        <p className={s.heroLead}>
          The Coven covenant is the product promise: persistent agents should be
          personal, inspectable, permissioned, and calm to operate.
        </p>
        <div className={s.heroActions}>
          <Link href="/docs/reference/safety" className={s.heroButtonPrimary}>
            Safety Reference
            <Icon icon="ph:arrow-right-bold" width={14} />
          </Link>
          <Link href="/docs/guide/concepts" className={s.heroButtonSecondary}>
            Core Concepts
          </Link>
        </div>
      </section>

      <section className={`${s.introSection} ${s.introSectionSolo}`}>
        <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {covenantPoints.map((item) => (
            <div
              key={item.title}
              style={{
                minHeight: '132px',
                border: '1px solid var(--home-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--home-surface)',
                padding: '1rem',
              }}
            >
              <Icon icon={item.icon} width={22} color="var(--home-violet)" />
              <h2 style={{ margin: '0.65rem 0 0.35rem', fontSize: '1rem', fontWeight: 750 }}>
                {item.title}
              </h2>
              <p style={{ margin: 0, color: 'var(--home-fg-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
