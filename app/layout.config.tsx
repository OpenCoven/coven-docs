import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Icon } from '@iconify/react';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: true,
  },
  nav: {
    title: (
      <span className="coven-docs-brand">
        {/* The approved OpenCoven logo; the name beside it is the accessible label. */}
        <img className="coven-docs-brand-logo" src="/opencoven-logo.svg" alt="" width={24} height={24} />
        <span className="coven-docs-brand-product">Coven</span>
        <span className="coven-docs-brand-label">Docs</span>
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
      text: 'Docs',
      url: '/docs',
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
