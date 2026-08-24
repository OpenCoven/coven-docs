import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const docsRoot = resolve(root, 'content/docs');
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function routeForFile(file) {
  const rel = relative(docsRoot, file).replaceAll('\\', '/').replace(/\.mdx$/, '');
  if (rel === 'index') return '/docs';
  if (rel.endsWith('/index')) return `/docs/${rel.slice(0, -'/index'.length)}`;
  return `/docs/${rel}`;
}

function stripCodeFences(source) {
  const lines = source.split(/\r?\n/);
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

function slugBase(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function collectAnchors(source) {
  const counts = new Map();
  const anchors = new Set();

  for (const line of stripCodeFences(source).split(/\r?\n/)) {
    const explicit = line.match(/\{#([A-Za-z0-9_-]+)\}\s*$/);
    if (explicit) anchors.add(explicit[1]);

    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!heading) continue;

    const base = slugBase(heading[1].replace(/\s*\{#[^}]+\}\s*$/, ''));
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function normalizeTargetPath(sourceRoute, hrefPath) {
  if (hrefPath.startsWith('/')) return hrefPath.replace(/\/$/, '') || '/';
  const base = sourceRoute.endsWith('/') ? sourceRoute : `${sourceRoute}/`;
  return new URL(hrefPath, `https://docs.local${base}`).pathname.replace(/\/$/, '') || '/';
}

const mdxFiles = walk(docsRoot).filter((file) => extname(file) === '.mdx');
const routes = new Map();
for (const file of mdxFiles) {
  const route = routeForFile(file);
  routes.set(route, {
    file,
    anchors: collectAnchors(readFileSync(file, 'utf8')),
  });
}

const linkPatterns = [
  /\]\(([^)\s]+(?:\s+["'][^"']*["'])?)\)/g,
  /\bhref=["']([^"']+)["']/g,
];

for (const file of mdxFiles) {
  if (file.includes(`${join('content', 'docs', 'openapi')}`)) continue;

  const source = stripCodeFences(readFileSync(file, 'utf8'));
  const sourceRoute = routeForFile(file);
  const hrefs = [];

  for (const pattern of linkPatterns) {
    for (const match of source.matchAll(pattern)) {
      hrefs.push(match[1].split(/\s+["']/)[0]);
    }
  }

  for (const rawHref of hrefs) {
    if (
      !rawHref.includes('#') ||
      /^(?:https?:|mailto:|tel:|javascript:)/i.test(rawHref)
    ) {
      continue;
    }

    const [rawPath, rawFragment] = rawHref.split('#', 2);
    if (!rawFragment) continue;

    let fragment;
    try {
      fragment = decodeURIComponent(rawFragment);
    } catch {
      failures.push(`${relative(root, file)} contains an invalid encoded fragment: ${rawHref}`);
      continue;
    }

    const targetPath = rawPath
      ? normalizeTargetPath(sourceRoute, rawPath)
      : sourceRoute;

    if (!targetPath.startsWith('/docs')) continue;
    if (targetPath.startsWith('/docs/openapi')) continue;

    const target = routes.get(targetPath);
    if (!target) {
      // The main link checker owns missing-route diagnostics.
      continue;
    }

    if (!target.anchors.has(fragment)) {
      failures.push(
        `${relative(root, file)} links to missing anchor ${targetPath}#${fragment}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Anchor-link check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Anchor-link check passed across ${mdxFiles.length} MDX pages.`);
