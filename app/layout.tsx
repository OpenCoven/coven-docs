import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import 'fumadocs-ui/style.css';
import 'fumadocs-ui/components/image-zoom2.css';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CovenSearchDialog } from '@/components/search-dialog';
import './globals.css';
import './docs-facelift.css';
import './docs-sidebar.css';
import './fonts/extended.css';

// The OpenCoven type system: Inter for reading, EB Garamond for display,
// and JetBrains Mono for code. Preload the Latin faces; the fallback stacks
// load other scripts on demand and retain the original fallback metrics.
const inter = localFont({
  src: './fonts/inter-normal-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-inter',
  fallback: ['Coven Inter Extended', 'Coven Inter Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

const display = localFont({
  src: [
    {
      path: './fonts/eb-garamond-normal-latin.woff2',
      weight: '400 800',
      style: 'normal',
    },
    {
      path: './fonts/eb-garamond-italic-latin.woff2',
      weight: '400 800',
      style: 'italic',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-eb-garamond',
  fallback: ['Coven Display Extended', 'Coven Display Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

const mono = localFont({
  src: './fonts/jetbrains-mono-normal-latin.woff2',
  weight: '100 800',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-jetbrains-mono',
  fallback: ['Coven Mono Extended', 'Coven Mono Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

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
    <html lang="en" className={`${inter.className} ${inter.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
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
