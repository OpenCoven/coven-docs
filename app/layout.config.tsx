import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Icon } from '@iconify/react';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: false,
  },
  nav: {
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, letterSpacing: '-0.5px' }}>
        <img src="/logo-mark.svg" alt="" style={{ width: '1.25rem', height: '1.25rem' }} />
        <span>Coven</span>
        <span style={{ fontSize: '0.7rem', color: '#9A8ECD', fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase', marginLeft: '2px' }}>docs</span>
      </span>
    ),
  },
  links: [
    {
      text: 'Learn',
      description: 'How Coven Works',
      url: '/docs/guide/getting-started',
      active: 'nested-url',
    },
    {
      text: 'Familiars',
      description: 'Project and Session Management',
      url: '/docs/familiars/sessions',
      active: 'nested-url',
    },
    {
      text: 'OpenCoven API',
      description: 'REST API Reference',
      url: '/docs/openapi/overview',
      active: 'nested-url',
    },
    {
      text: 'Reference',
      description: 'API, Authentication, and Safety',
      url: '/docs/reference/api',
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
