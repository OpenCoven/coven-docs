import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { LinkItemType } from 'fumadocs-ui/layouts/shared';
import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { SidebarRail } from '@/components/sidebar-rail';
import { DocsScrollToTop } from '@/components/docs-scroll-to-top';
import { source } from '@/lib/source';

// The docs sidebar renders text links as rows above the page tree, where
// "Home" and "Docs" read as two extra pages. Keep only the icon links (they
// land in the footer row), add Home there, and let the brand open the docs
// overview instead.
const docsLinks: LinkItemType[] = [
  {
    type: 'icon',
    text: 'Home',
    label: 'Home',
    url: '/',
    icon: <Icon icon="ph:house-duotone" width={18} />,
    secondary: true,
  },
  ...(baseOptions.links ?? []).filter((link) => link.type === 'icon'),
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      nav={{ ...baseOptions.nav, url: '/docs' }}
      links={docsLinks}
    >
      <DocsScrollToTop />
      <SidebarRail />
      {children}
    </DocsLayout>
  );
}
