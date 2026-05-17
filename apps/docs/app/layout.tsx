import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import './style.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={{
          name: 'Docs',
          children: [
            { name: 'Getting Started', url: '/docs' },
            { name: 'Concepts', url: '/docs/concepts' },
            { name: 'Harness', url: '/docs/harness' },
            { name: 'Familiars', url: '/docs/familiars' },
            { name: 'API', url: '/docs/api' },
          ],
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
