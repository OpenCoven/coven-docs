import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Icon } from '@iconify/react';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: false,
  },
  nav: {
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, letterSpacing: 0 }}>
        <Icon icon="ph:sparkle-duotone" width={20} color="#9A8ECD" />
        <span>Coven</span>
        <span style={{ fontSize: '0.78rem', color: '#D7D2FF', fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', marginLeft: '2px' }}>docs</span>
      </span>
    ),
  },
  links: [
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
    {
      type: 'icon',
      text: 'Fumadocs',
      label: 'Fumadocs',
      url: 'https://fumadocs.dev',
      icon: <Icon icon="ph:book-open-duotone" width={18} />,
      secondary: true,
      external: true,
    },
  ],
};
