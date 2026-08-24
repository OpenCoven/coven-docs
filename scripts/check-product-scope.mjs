import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(`${label} must be an array of strings in docs/site-manifest.json`);
    return [];
  }
  return value;
}

const manifest = JSON.parse(read('docs/site-manifest.json'));
const rootMeta = JSON.parse(read('content/docs/meta.json'));
const sections = Array.isArray(manifest.sections) ? manifest.sections : [];
if (sections.length === 0) {
  fail('sections must be a non-empty array in docs/site-manifest.json');
}
const expectedSections = sections
  .filter((section) => section && typeof section.slug === 'string')
  .map((section) => section.slug);
const retiredReferencePrefixes = requireStringArray(
  manifest.retiredReferencePrefixes,
  'retiredReferencePrefixes',
);
const retiredFilePaths = requireStringArray(
  manifest.retiredFilePaths,
  'retiredFilePaths',
);

if (!Array.isArray(rootMeta.pages)) {
  fail('content/docs/meta.json pages must be an array');
} else if (JSON.stringify(rootMeta.pages) !== JSON.stringify(expectedSections)) {
  fail(`root navigation must match docs/site-manifest.json: ${expectedSections.join(', ')}`);
}

for (const retiredSection of ['guides', 'familiars']) {
  if (Array.isArray(rootMeta.pages) && rootMeta.pages.includes(retiredSection)) {
    fail(`root navigation still exposes retired ${retiredSection} section`);
  }
}

for (const directory of ['app', 'components', 'content/docs']) {
  for (const path of collectFiles(resolve(root, directory))) {
    if (path.includes('/content/docs/openapi/')) continue;
    if (!/\.(?:ts|tsx|mdx|json)$/.test(path)) continue;

    const source = readFileSync(path, 'utf8');
    for (const retiredPrefix of retiredReferencePrefixes) {
      if (source.includes(retiredPrefix)) {
        fail(
          `retired documentation route ${retiredPrefix} remains referenced: ${path.slice(root.length + 1)}`,
        );
      }
    }
  }
}

for (const retiredPage of retiredFilePaths) {
  if (existsSync(resolve(root, retiredPage))) {
    fail(`retired documentation surface still exists: ${retiredPage}`);
  }
}

if (failures.length > 0) {
  console.error(`Product-scope check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Product-scope check passed.');
