import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import 'fumadocs-ui/style.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.coven.dev'),
  title: {
    default: 'Coven Docs',
    template: '%s | Coven Docs',
  },
  description: 'Persistent AI familiars. Composable. Observable. Publishable.',
  keywords: 'Coven, AI agents, familiars, OpenClaw, documentation',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    title: 'Coven Docs',
    description: 'Persistent AI familiars. Composable. Observable. Publishable.',
    url: 'https://docs.coven.dev',
    siteName: 'Coven Docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coven Docs',
    description: 'Persistent AI familiars. Composable. Observable. Publishable.',
    creator: '@OpenCvn',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
