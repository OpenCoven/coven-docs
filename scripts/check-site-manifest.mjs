import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(root, 'content', 'docs');
const manifestPath = join(root, 'docs', 'site-manifest.json');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read JSON at ${path.slice(root.length + 1)}: ${error.message}`);
    return null;
  }
}

function pageExists(sectionRoot, page) {
  return (
    existsSync(join(sectionRoot, `${page}.mdx`)) ||
    existsSync(join(sectionRoot, page, 'index.mdx')) ||
    existsSync(join(sectionRoot, page, 'meta.json'))
  );
}

const manifest = readJson(manifestPath);
const rootMeta = readJson(join(docsRoot, 'meta.json'));

if (!manifest || !rootMeta) {
  process.exit(1);
}

if (manifest.schemaVersion !== 1) {
  fail('docs/site-manifest.json schemaVersion must be 1');
}

if (typeof manifest.canonicalScope !== 'string' || manifest.canonicalScope.trim().length < 40) {
  fail('docs/site-manifest.json must declare a meaningful canonicalScope');
}

if (!Array.isArray(manifest.sections) || manifest.sections.length === 0) {
  fail('docs/site-manifest.json must define at least one section');
}

const allowedStability = new Set(['stable', 'preview', 'experimental', 'historical']);
const slugs = [];
for (const section of manifest.sections ?? []) {
  const label = section?.slug ?? '<missing slug>';
  slugs.push(section?.slug);

  for (const field of ['slug', 'title', 'description', 'searchDescription', 'owner', 'sourceRepo']) {
    if (typeof section?.[field] !== 'string' || section[field].trim() === '') {
      fail(`section ${label} is missing non-empty ${field}`);
    }
  }

  if (!allowedStability.has(section?.stability)) {
    fail(`section ${label} has unsupported stability ${section?.stability}`);
  }

  if (typeof section?.searchable !== 'boolean') {
    fail(`section ${label} must declare searchable as a boolean`);
  }

  const sectionRoot = join(docsRoot, section.slug);
  const metaPath = join(sectionRoot, 'meta.json');
  const indexPath = join(sectionRoot, 'index.mdx');

  if (!existsSync(metaPath)) {
    fail(`section ${label} is missing content/docs/${label}/meta.json`);
    continue;
  }
  if (!existsSync(indexPath)) {
    fail(`section ${label} is missing content/docs/${label}/index.mdx`);
  }

  const meta = readJson(metaPath);
  if (!meta) continue;

  if (meta.title !== section.title) {
    fail(`section ${label} meta title must match manifest title "${section.title}"`);
  }
  if (meta.description !== section.description) {
    fail(`section ${label} meta description must match manifest description "${section.description}"`);
  }
  if (meta.root !== true) {
    fail(`section ${label} meta must set root: true`);
  }
  if (!Array.isArray(meta.pages)) {
    fail(`section ${label} meta must declare a pages array`);
  } else {
    for (const page of meta.pages) {
      if (typeof page !== 'string') {
        fail(`section ${label} meta contains a non-string page entry`);
        continue;
      }
      if (!pageExists(sectionRoot, page)) {
        fail(`section ${label} meta references missing page or folder: ${page}`);
      }
    }
  }
}

const duplicateSlugs = slugs.filter((slug, index) => slug && slugs.indexOf(slug) !== index);
if (duplicateSlugs.length > 0) {
  fail(`manifest section slugs must be unique: ${[...new Set(duplicateSlugs)].join(', ')}`);
}

const actualRootPages = Array.isArray(rootMeta.pages) ? rootMeta.pages : [];
if (JSON.stringify(actualRootPages) !== JSON.stringify(slugs)) {
  fail(`content/docs/meta.json pages must exactly match manifest order: ${slugs.join(', ')}`);
}

const redirectSources = new Set();
for (const redirect of manifest.redirects ?? []) {
  if (
    typeof redirect?.source !== 'string' ||
    !redirect.source.startsWith('/') ||
    typeof redirect?.destination !== 'string' ||
    !redirect.destination.startsWith('/') ||
    typeof redirect?.permanent !== 'boolean'
  ) {
    fail(`invalid redirect entry: ${JSON.stringify(redirect)}`);
    continue;
  }
  if (redirectSources.has(redirect.source)) {
    fail(`duplicate redirect source: ${redirect.source}`);
  }
  redirectSources.add(redirect.source);
}

const guideMeta = readJson(join(docsRoot, 'guide', 'meta.json'));
const experimentalMeta = readJson(join(docsRoot, 'experimental', 'meta.json'));
if (guideMeta?.pages?.includes('agent-filesystem')) {
  fail('agent-filesystem must not remain in the stable Guide navigation');
}
if (!guideMeta?.pages?.includes('ecosystem')) {
  fail('Guide navigation must include the ecosystem boundary page');
}
if (!experimentalMeta?.pages?.includes('agent-filesystem')) {
  fail('Experimental navigation must include agent-filesystem');
}

const experimentalSection = manifest.sections.find((section) => section.slug === 'experimental');
if (experimentalSection?.stability !== 'experimental') {
  fail('the experimental section must be classified as experimental');
}

if (failures.length > 0) {
  console.error(`Site-manifest check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Site manifest check passed for ${manifest.sections.length} sections and ${manifest.redirects.length} redirects.`);
