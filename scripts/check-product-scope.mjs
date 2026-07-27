import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const docs = resolve(root, 'content/docs');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function fail(message) {
  failures.push(message);
}

const rootMeta = JSON.parse(read('content/docs/meta.json'));
const expectedSections = ['guide', 'cli', 'harnesses', 'daemon', 'memory-models', 'coven-code', 'openapi', 'reference'];
if (JSON.stringify(rootMeta.pages) !== JSON.stringify(expectedSections)) {
  fail(`root navigation must be ${expectedSections.join(', ')}`);
}

for (const retiredSection of ['guides', 'familiars']) {
  if (rootMeta.pages.includes(retiredSection)) {
    fail(`root navigation still exposes retired ${retiredSection} section`);
  }
}

const retiredRoute = /\/docs\/(?:guides|familiars|guide\/(?:cast-codes|cave|surfaces|demo-loop)|reference\/(?:roadmap|migration-map|issue-plan|docs-platform|feedback-widget|ask-salem|coven-relay|coven-github-agent|channels|glossolalia|harness-vs-runtime|dispatch-contract|familiar-contract|api-architecture|changelog))/;

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

for (const directory of ['app', 'components', 'content/docs']) {
  for (const path of collectFiles(resolve(root, directory))) {
    if (path.includes('/content/docs/openapi/')) continue;
    if (!/\.(?:ts|tsx|mdx|json)$/.test(path)) continue;
    if (retiredRoute.test(readFileSync(path, 'utf8'))) {
      fail(`retired documentation route remains referenced: ${path.slice(root.length + 1)}`);
    }
  }
}

for (const retiredPage of [
  'content/docs/reference/roadmap.mdx',
  'content/docs/reference/migration-map.mdx',
  'content/docs/reference/issue-plan.mdx',
  'content/docs/reference/docs-platform.mdx',
  'content/docs/reference/feedback-widget.mdx',
  'content/docs/reference/ask-salem.mdx',
  'content/docs/reference/coven-relay.mdx',
  'content/docs/reference/coven-github-agent.mdx',
  'content/docs/reference/channels.mdx',
  'content/docs/reference/glossolalia.mdx',
  'content/docs/reference/harness-vs-runtime.mdx',
  'content/docs/reference/dispatch-contract.mdx',
  'content/docs/reference/familiar-contract.mdx',
  'content/docs/reference/api-architecture.mdx',
  'content/docs/reference/changelog.mdx',
  'content/docs/guide/cast-codes.mdx',
  'content/docs/guide/cave.mdx',
  'content/docs/guide/surfaces.mdx',
  'content/docs/guide/demo-loop',
  'content/docs/guides',
  'content/docs/familiars',
]) {
  if (existsSync(resolve(root, retiredPage))) {
    fail(`retired documentation surface still exists: ${retiredPage}`);
  }
}

if (failures.length > 0) {
  console.error(`Product-scope check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Product-scope check passed.');
