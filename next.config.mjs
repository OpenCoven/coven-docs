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
        destination: '/docs/reference/glossolalia',
        permanent: true,
      },
    ];
  },
};

export default withMDX(nextConfig);
