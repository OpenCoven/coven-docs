import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import s from '../home.module.css';

export const metadata: Metadata = {
  title: 'Archives',
  description: 'Preserved Coven records, session history, and migration maps.',
};

const archiveLinks = [
  {
    title: 'Session Lifecycle',
    href: '/docs/familiars/sessions',
    icon: 'ph:archive-duotone',
    desc: 'Archive, summon, and inspect preserved session records.',
  },
  {
    title: 'Migration Map',
    href: '/docs/reference/migration-map',
    icon: 'ph:map-trifold-duotone',
    desc: 'Track where older docs and concepts now live in the Coven docs.',
  },
  {
    title: 'Roadmap',
    href: '/docs/reference/roadmap',
    icon: 'ph:signpost-duotone',
    desc: 'Follow shipped work, open areas, and planned product direction.',
  },
];

export default function ArchivesPage() {
  return (
    <main className={s.homeMain}>
      <section className={`${s.heroPanel} ${s.heroPanelSolo}`}>
        <div className={s.heroGridBg} />
        <p className={s.heroEyebrow}>Coven Records</p>
        <h1 className={s.heroTitle}>Archives</h1>
        <p className={s.heroLead}>
          Preserved sessions, migration history, and durable records for the work
          Coven keeps around after the active run is finished.
        </p>
      </section>

      <section className={`${s.introSection} ${s.introSectionSolo}`}>
        <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {archiveLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={s.heroButtonSecondary}
              style={{
                minHeight: '132px',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                flexDirection: 'column',
                padding: '1rem',
                color: 'var(--home-fg)',
              }}
            >
              <Icon icon={item.icon} width={22} color="var(--home-violet)" />
              <span style={{ fontWeight: 750 }}>{item.title}</span>
              <span style={{ color: 'var(--home-fg-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {item.desc}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
