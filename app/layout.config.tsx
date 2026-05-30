import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Icon } from '@iconify/react';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: true,
  },
  nav: {
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, letterSpacing: 0, transform: 'translateY(4px)' }}>
        <Icon icon="ph:sparkle-duotone" width={20} color="var(--coven-violet)" />
        <span>Coven</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--coven-violet)', fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', marginLeft: '2px' }}>docs</span>
      </span>
    ),
  },
  links: [
    {
      text: 'Home',
      url: '/',
      active: 'url',
    },
    {
      text: 'Archives',
      url: '/archives',
      active: 'nested-url',
    },
    {
      text: 'Covenant',
      url: '/covenant',
      active: 'nested-url',
    },
    {
      type: 'icon',
      text: 'GitHub',
      label: 'GitHub',
      url: 'https://github.com/OpenCoven/coven',
      icon: <Icon icon="ph:github-logo-duotone" width={18} />,
      secondary: true,
      external: true,
    },
    {
      type: 'icon',
      text: 'Discord',
      label: 'Discord',
      url: 'https://discord.gg/opencoven',
      icon: <Icon icon="ph:discord-logo-duotone" width={18} />,
      secondary: true,
      external: true,
    },
  ],
};
