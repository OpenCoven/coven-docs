import { createMDX } from 'fumadocs-mdx/next';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();
const root = dirname(fileURLToPath(import.meta.url));
const siteManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('./docs/site-manifest.json', import.meta.url)), 'utf8'),
);
const buildCommit =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'local';

if (!/^[A-Za-z0-9._-]+$/.test(buildCommit)) {
  throw new Error('Deployment commit identifier contains unsupported characters.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: {
    root,
  },
  async redirects() {
    return siteManifest.redirects;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'x-coven-docs-commit',
            value: buildCommit,
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
