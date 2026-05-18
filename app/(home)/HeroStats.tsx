// Server component — fetches at build/revalidate time, zero client JS

import { Icon } from '@iconify/react';
import s from './home.module.css';

const VIOLET = '#9A8ECD';
const BORDER = '1px solid rgba(154,142,205,0.14)';

type Stat = {
  icon: string;
  label: string;
  value: string;
  href: string;
};

async function fetchStats(): Promise<Stat[]> {
  const stats: Stat[] = [];

  // GitHub stars + forks
  try {
    const res = await fetch('https://api.github.com/repos/OpenCoven/coven', {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.ok) {
      const data = await res.json();
      stats.push({
        icon: 'ph:star-duotone',
        label: 'stars',
        value: data.stargazers_count >= 1000
          ? `${(data.stargazers_count / 1000).toFixed(1)}k`
          : String(data.stargazers_count),
        href: 'https://github.com/OpenCoven/coven/stargazers',
      });
      stats.push({
        icon: 'ph:git-fork-duotone',
        label: 'forks',
        value: String(data.forks_count),
        href: 'https://github.com/OpenCoven/coven/forks',
      });
    }
  } catch { /* graceful — show nothing rather than break */ }

  // npm latest version
  try {
    const res = await fetch('https://registry.npmjs.org/@opencoven/cli/latest', {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      stats.push({
        icon: 'ph:package-duotone',
        label: 'npm',
        value: `v${data.version}`,
        href: 'https://www.npmjs.com/package/@opencoven/cli',
      });
    }
  } catch { /* graceful */ }

  // Static signal
  stats.push({
    icon: 'ph:shield-check-duotone',
    label: 'license',
    value: 'MIT',
    href: 'https://github.com/OpenCoven/coven/blob/main/LICENSE',
  });

  return stats;
}

export async function HeroStats() {
  const stats = await fetchStats();
  if (stats.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      border: BORDER,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      width: 'fit-content',
      background: 'rgba(255,255,255,0.02)',
      marginTop: '2rem',
      position: 'relative',
    }}>
      {stats.map((stat, i) => (
        <a
          key={stat.label}
          href={stat.href}
          target="_blank"
          rel="noopener noreferrer"
          className={s.statPill}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            textDecoration: 'none',
            borderRight: i < stats.length - 1 ? BORDER : undefined,
          }}
        >
          <Icon icon={stat.icon} width={13} color={VIOLET} />
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#C0C0C0',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
          }}>
            {stat.value}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.02em' }}>
            {stat.label}
          </span>
        </a>
      ))}
    </div>
  );
}
