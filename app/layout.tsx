import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider';
import 'fumadocs-ui/style.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://docs.coven.dev';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Coven Docs',
    template: '%s | Coven Docs',
  },
  description: 'Persistent AI familiars. Composable. Observable. Publishable.',
  keywords: 'Coven, AI agents, familiars, OpenClaw, open source, documentation',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    title: 'Coven Documentation',
    description: 'Persistent AI familiars. Composable. Observable. Publishable.',
    url: BASE_URL,
    siteName: 'Coven Docs',
    images: [
      {
        url: `${BASE_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: 'Coven Documentation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coven Docs',
    description: 'Persistent AI familiars. Composable. Observable. Publishable.',
    creator: '@OpenCvn',
    images: [`${BASE_URL}/api/og`],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
