// Resolve a docs section's sidebar pages and page files through Fumadocs
// route-group folders. A folder named `(name)` groups pages in the sidebar
// without adding a URL segment, so `memory-models/(memory)/working-memory.mdx`
// still serves /docs/memory-models/working-memory. Section checks use these
// helpers instead of assuming every page sits directly in the section folder.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROUTE_GROUP = /^\(.+\)$/;

function readMeta(dir) {
  const path = join(dir, 'meta.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function routeGroups(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && ROUTE_GROUP.test(entry.name))
    .map((entry) => join(dir, entry.name));
}

/**
 * URL slug segments for an MDX file under `docsRoot`, as Fumadocs builds them:
 * route-group folders and a trailing `index` add no segment.
 */
export function docsSlug(docsRoot, file) {
  const segments = relative(docsRoot, file)
    .replaceAll('\\', '/')
    .replace(/\.mdx$/, '')
    .split('/')
    .filter((segment) => !ROUTE_GROUP.test(segment));
  if (segments.at(-1) === 'index') segments.pop();
  return segments;
}

/** The `/docs/...` route an MDX file under `docsRoot` is served at. */
export function docsRoute(docsRoot, file) {
  const slug = docsSlug(docsRoot, file);
  return slug.length === 0 ? '/docs' : `/docs/${slug.join('/')}`;
}

/**
 * Every item a section's sidebar lists, in order, with route groups expanded
 * in place: a group contributes its `pagesIndex` page, then its own pages.
 */
export function navPages(sectionRoot) {
  const items = [];
  const walk = (dir) => {
    const meta = readMeta(dir);
    if (!meta) return;
    if (meta.pagesIndex) items.push(meta.pagesIndex);
    for (const item of meta.pages ?? []) {
      if (ROUTE_GROUP.test(item) && existsSync(join(dir, item))) walk(join(dir, item));
      else items.push(item);
    }
  };
  walk(sectionRoot);
  return items;
}

/**
 * Path of a page's MDX file, directly in the section or inside a route group.
 * Falls back to the flat path so a missing page still reports where it was
 * expected.
 */
export function pagePath(sectionRoot, page) {
  const search = (dir) => {
    const direct = join(dir, `${page}.mdx`);
    if (existsSync(direct)) return direct;
    for (const group of routeGroups(dir)) {
      const found = search(group);
      if (found) return found;
    }
    return null;
  };
  return search(sectionRoot) ?? join(sectionRoot, `${page}.mdx`);
}
