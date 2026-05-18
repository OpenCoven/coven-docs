import type { NextConfig } from 'next';
import createMDX from 'fumadocs-mdx/config';

const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withMDX(nextConfig);
