import { createMDX } from 'fumadocs-mdx/next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();
const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: {
    root,
  },
  async redirects() {
    return [
      {
        source: '/docs/reference/vocabulary',
        destination: '/docs/guide/concepts',
        permanent: true,
      },
      {
        source: '/docs/guides/:path*',
        destination: '/docs/guide/getting-started',
        permanent: true,
      },
      {
        source: '/docs/familiars/:path*',
        destination: '/docs/cli/sessions',
        permanent: true,
      },
      {
        source: '/docs/guide/:path(cast-codes|cave|surfaces|demo-loop)',
        destination: '/docs/guide/concepts',
        permanent: true,
      },
      {
        source: '/docs/guide/demo-loop/:path*',
        destination: '/docs/guide/getting-started',
        permanent: true,
      },
      {
        source: '/docs/reference/:path(roadmap|migration-map|issue-plan|docs-platform|feedback-widget|ask-salem|coven-relay|coven-github-agent|channels|glossolalia|harness-vs-runtime|dispatch-contract|familiar-contract|api-architecture|changelog)',
        destination: '/docs',
        permanent: true,
      },
      {
        source: '/docs/coven-codes',
        destination: '/docs/coven-code',
        permanent: true,
      },
      {
        // The old section's install-debugging page split into install + troubleshooting.
        source: '/docs/coven-codes/install-debugging',
        destination: '/docs/coven-code/troubleshooting',
        permanent: true,
      },
      {
        source: '/docs/coven-codes/:path*',
        destination: '/docs/coven-code/:path*',
        permanent: true,
      },
    ];
  },
};

export default withMDX(nextConfig);
