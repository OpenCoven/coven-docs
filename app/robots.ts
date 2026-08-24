import type { MetadataRoute } from 'next';
import { docsManifest } from '@/lib/docs-manifest';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    host: docsManifest.baseUrl,
    sitemap: `${docsManifest.baseUrl}/sitemap.xml`,
  };
}
