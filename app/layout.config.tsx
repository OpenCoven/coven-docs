import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, letterSpacing: '-0.5px' }}>
        <span style={{ fontSize: '1.25rem' }}>✦</span>
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
      text: 'GitHub',
      url: 'https://github.com/OpenCoven/coven',
    },
    {
      text: 'Discord',
      url: 'https://discord.gg/opencoven',
    },
  ],
};
