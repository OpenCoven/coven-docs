import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';
import s from './home.module.css';

// The landing page uses the same OpenCoven type system as the docs: EB Garamond
// for headings and the editorial line, Inter for body text, both loaded in the
// root layout. See --home-display in home.module.css.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`flex-1 flex flex-col ${s.shell}`}
      style={{ background: 'var(--color-fd-background)' }}
    >
      <HomeLayout {...baseOptions}>
        {children}
      </HomeLayout>
    </div>
  );
}
