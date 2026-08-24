import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import 'fumadocs-ui/style.css';
import 'fumadocs-ui/components/image-zoom2.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CovenSearchDialog } from '@/components/search-dialog';
import './globals.css';
import './docs-facelift.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://docs.opencoven.ai';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Coven Docs',
    template: '%s | Coven Docs',
  },
  description: 'A local runtime for durable, auditable coding-agent work.',
  keywords: 'Coven, coding agents, harnesses, local runtime, session records, documentation',
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    title: 'Coven Documentation',
    description: 'A local runtime for durable, auditable coding-agent work.',
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
    description: 'A local runtime for durable, auditable coding-agent work.',
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
        <RootProvider
          search={{
            SearchDialog: CovenSearchDialog,
            options: {
              links: [
                ['Getting Started', '/docs/guide/getting-started'],
                ['Architecture', '/docs/guide/architecture'],
                ['API Reference', '/docs/reference/api'],
              ],
            },
          }}
        >
          {children}
        </RootProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
