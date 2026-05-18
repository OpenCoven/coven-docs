import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 flex flex-col" style={{ background: 'var(--color-fd-background)' }}>
      <HomeLayout {...baseOptions}>
        {children}
      </HomeLayout>
    </main>
  );
}
