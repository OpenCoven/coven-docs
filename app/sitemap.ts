import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { docsManifest } from '@/lib/docs-manifest';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: docsManifest.baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: `${docsManifest.baseUrl}${page.url}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: page.url === '/docs' ? 0.95 : 0.75,
    })),
  ];
}
