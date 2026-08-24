import rawManifest from '@/docs/site-manifest.json';

export type DocsStability = 'stable' | 'preview' | 'experimental' | 'historical';

export interface DocsSection {
  slug: string;
  title: string;
  description: string;
  searchDescription: string;
  stability: DocsStability;
  owner: string;
  sourceRepo: string;
  searchable: boolean;
}

interface DocsRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

interface DocsManifest {
  schemaVersion: number;
  canonicalProduct: string;
  canonicalScope: string;
  baseUrl: string;
  sections: DocsSection[];
  redirects: DocsRedirect[];
  retiredReferencePrefixes: string[];
  retiredFilePaths: string[];
}

export const docsManifest = rawManifest as DocsManifest;
export const docsSections = docsManifest.sections;

export function getDocsSection(slug?: string): DocsSection | undefined {
  if (!slug) return undefined;
  return docsSections.find((section) => section.slug === slug);
}

export function getStabilityLabel(stability: DocsStability): string {
  switch (stability) {
    case 'stable':
      return 'Stable';
    case 'preview':
      return 'Preview';
    case 'experimental':
      return 'Experimental';
    case 'historical':
      return 'Historical';
  }
}
