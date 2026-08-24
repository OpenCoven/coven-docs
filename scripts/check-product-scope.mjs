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

const manifest = JSON.parse(read('docs/site-manifest.json'));
const rootMeta = JSON.parse(read('content/docs/meta.json'));
const expectedSections = manifest.sections.map((section) => section.slug);

if (JSON.stringify(rootMeta.pages) !== JSON.stringify(expectedSections)) {
  fail(`root navigation must match docs/site-manifest.json: ${expectedSections.join(', ')}`);
}

for (const retiredSection of ['guides', 'familiars']) {
  if (rootMeta.pages.includes(retiredSection)) {
    fail(`root navigation still exposes retired ${retiredSection} section`);
  }
}

for (const directory of ['app', 'components', 'content/docs']) {
  for (const path of collectFiles(resolve(root, directory))) {
    if (path.includes('/content/docs/openapi/')) continue;
    if (!/\.(?:ts|tsx|mdx|json)$/.test(path)) continue;

    const source = readFileSync(path, 'utf8');
    for (const retiredPrefix of manifest.retiredReferencePrefixes) {
      if (source.includes(retiredPrefix)) {
        fail(
          `retired documentation route ${retiredPrefix} remains referenced: ${path.slice(root.length + 1)}`,
        );
      }
    }
  }
}

for (const retiredPage of manifest.retiredFilePaths) {
  if (existsSync(resolve(root, retiredPage))) {
    fail(`retired documentation surface still exists: ${retiredPage}`);
  }
}

if (failures.length > 0) {
  console.error(`Product-scope check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Product-scope check passed.');
