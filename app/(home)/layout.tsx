import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Eczar } from 'next/font/google';
import { baseOptions } from '@/app/layout.config';

// Display face for the landing page only — headings and the editorial line.
// Body text stays Inter (inherited from the root layout) for cohesion with docs.
// Loaded as the variable font: Google serves Eczar's static weights from
// `/l/font?kit=…&skey=…` URLs, and Turbopack's next/font loader fails to parse
// the `&` in them ("next/font/google queries have exactly one entry").
const eczar = Eczar({
  subsets: ['latin'],
  variable: '--font-home-display',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`flex-1 flex flex-col ${eczar.variable}`}
      style={{ background: 'var(--color-fd-background)' }}
    >
      <HomeLayout {...baseOptions}>
        {children}
      </HomeLayout>
    </div>
  );
}
