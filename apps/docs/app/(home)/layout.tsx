import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';
import '@/app/globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 flex flex-col">
      <HomeLayout {...baseOptions}>
        {children}
      </HomeLayout>
    </main>
  );
}
