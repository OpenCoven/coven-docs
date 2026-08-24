import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertIncludes(file, text, label = text) {
  const content = read(file);
  if (!content.includes(text)) {
    throw new Error(`${file} is missing ${label}`);
  }
}

function assertNotIncludes(file, text, label = text) {
  const content = read(file);
  if (content.includes(text)) {
    throw new Error(`${file} still includes ${label}`);
  }
}

function assertFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`${file} does not exist`);
  }
}

assertIncludes('app/layout.config.tsx', "text: 'Home'", 'Home header link');
assertIncludes('app/layout.config.tsx', "url: '/'", 'Home header route');
assertNotIncludes('content/docs/meta.json', '"familiars"', 'Familiars root navigation option');

assertFile('docs/site-manifest.json');
assertFile('lib/docs-manifest.ts');
assertFile('scripts/check-site-manifest.mjs');
assertIncludes('next.config.mjs', 'docs/site-manifest.json', 'manifest-driven redirects');

assertFile('components/mdx-components.tsx');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/codeblock', 'CodeBlock MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/files', 'Files MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/image-zoom', 'ImageZoom MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/steps', 'Steps MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/tabs', 'Tabs MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/accordion', 'Accordion MDX wiring');
assertIncludes('components/mdx-components.tsx', 'fumadocs-ui/components/type-table', 'TypeTable MDX wiring');

assertIncludes('app/docs/[[...slug]]/page.tsx', 'ViewOptionsPopover', 'page actions');
assertIncludes('app/docs/[[...slug]]/page.tsx', 'getGithubLastEdit', 'GitHub last edit lookup');
assertIncludes('app/docs/[[...slug]]/page.tsx', 'DocsStatus', 'page stability and ownership status');
assertIncludes('app/docs/[[...slug]]/page.tsx', 'alternates:', 'canonical page metadata');
assertIncludes('app/docs/[[...slug]]/page.tsx', 'OpenCoven', 'OpenCoven GitHub owner');
assertIncludes('app/docs/[[...slug]]/page.tsx', 'coven-docs', 'coven-docs GitHub repo');

assertFile('app/api/search/route.ts');
assertIncludes('app/api/search/route.ts', 'createFromSource', 'Fumadocs search API');
assertIncludes('app/api/search/route.ts', 'tag:', 'search tag filter');

assertFile('components/search-dialog.tsx');
assertIncludes('components/search-dialog.tsx', 'Filter', 'search filter UI');
assertIncludes('components/search-dialog.tsx', 'aria-haspopup="listbox"', 'compact search filter dropdown');
assertIncludes('components/search-dialog.tsx', 'docsSections', 'manifest-driven search filters');
assertNotIncludes('components/search-dialog.tsx', 'Familiars', 'Familiars search filter');
if (read('components/search-dialog.tsx').includes('SearchDialogFooter')) {
  throw new Error('components/search-dialog.tsx still uses SearchDialogFooter for filters');
}

assertFile('app/robots.ts');
assertFile('app/sitemap.ts');
assertFile('app/build.txt/route.ts');
assertIncludes('next.config.mjs', 'x-coven-docs-commit', 'deployment commit header');

assertIncludes('source.config.ts', 'includeProcessedMarkdown', 'export processed markdown');
assertIncludes('lib/source.ts', "@/.source/server", 'Fumadocs v15 server source entry');

assertFile('app/export/epub/route.ts');
assertIncludes('app/export/epub/route.ts', 'exportEpub', 'EPUB export route');

assertFile('scripts/export-pdf.mjs');
assertIncludes('scripts/export-pdf.mjs', 'puppeteer', 'PDF export script');

assertFile('scripts/validate-links.mjs');
assertIncludes('scripts/validate-links.mjs', 'next-validate-link', 'link validation script');

assertFile('scripts/check-anchor-links.mjs');
assertFile('scripts/check-generated.mjs');
assertFile('scripts/smoke-docs.mjs');

assertFile('scripts/generate-obsidian.mjs');
assertIncludes('scripts/generate-obsidian.mjs', 'fumadocs-obsidian', 'Obsidian generation script');

console.log('Fumadocs platform wiring looks complete.');
