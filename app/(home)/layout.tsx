import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Eczar } from 'next/font/google';
import { baseOptions } from '@/app/layout.config';

// Display face for the landing page only — headings and the editorial line.
// Body text stays Inter (inherited from the root layout) for cohesion with docs.
const eczar = Eczar({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
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
