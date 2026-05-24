import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const daemonRoot = join(docsRoot, 'daemon');

const requiredPages = [
  'index',
  'lifecycle',
  'configuration',
  'socket-api',
  'security',
  'observability',
  'recovery-upgrades',
];

function fail(message) {
  console.error(`Daemon docs check failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read JSON at ${path}: ${error.message}`);
  }
}

const topLevelMeta = readJson(join(docsRoot, 'meta.json'));

if (!Array.isArray(topLevelMeta.pages) || !topLevelMeta.pages.includes('daemon')) {
  fail('content/docs/meta.json must include a first-class "daemon" nav section.');
}

const daemonMetaPath = join(daemonRoot, 'meta.json');
if (!existsSync(daemonMetaPath)) {
  fail('content/docs/daemon/meta.json is missing.');
}

const daemonMeta = readJson(daemonMetaPath);

if (daemonMeta.title !== 'Daemon') {
  fail('content/docs/daemon/meta.json must use title "Daemon".');
}

if (daemonMeta.description !== 'Process and Socket API') {
  fail('content/docs/daemon/meta.json description must describe the operational daemon section.');
}

const actualPages = Array.isArray(daemonMeta.pages) ? daemonMeta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/daemon/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

for (const page of requiredPages) {
  const file = join(daemonRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing daemon doc page: content/docs/daemon/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/daemon/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('/docs/reference/api') && page === 'socket-api') {
    fail('socket-api page must cross-link the existing local API reference.');
  }

  if (!source.includes('/docs/reference/api-architecture') && page === 'index') {
    fail('daemon overview must cross-link the existing API architecture diagrams.');
  }
}

console.log('Daemon docs check passed.');
