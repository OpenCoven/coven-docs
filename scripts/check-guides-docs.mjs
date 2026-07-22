import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const guidesRoot = join(docsRoot, 'guides');

const requiredPages = [
  'index',
  'install-and-first-run',
  'connect-a-harness',
  'set-up-the-daemon',
  'set-up-memory',
  'fix-a-failed-install',
  'upgrade-coven',
  'script-the-api',
];

const requiredMentions = [
  'step-by-step',
  'Prerequisites',
  'Numbered steps',
  'Expected output',
  'Troubleshooting',
  'copy-pasteable',
  'coven doctor',
  'npm install -g @opencoven/cli',
  'npm install -g @openai/codex',
  'codex login',
  '@anthropic-ai/claude-code',
  'claude doctor',
  'coven run codex',
  'coven sessions --plain',
  'Coven session created',
  'coven engine install',
  'coven adapter install',
  '@github/copilot',
  'copilot login',
  'coven daemon start',
  'coven daemon status',
  'coven daemon restart',
  'coven daemon stop',
  '/api/v1/health',
  'coven.daemon.v1',
  'coven memory',
  '~/.coven/memory/',
  'coven-memory -- ingest',
  'coven-memory -- search',
  '--familiar',
  'which -a coven',
  '@opencoven/cli@latest',
  'npx @opencoven/cli doctor',
  'cargo install --path crates/coven-cli',
  'coven --version',
  '/api/v1/capabilities',
  'coven sessions --all --plain',
  '/api/v1/sessions',
  '/api/v1/events',
  'nextCursor',
  'error.code',
  'session_not_found',
];

function fail(message) {
  console.error(`Guides docs check failed: ${message}`);
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

if (!Array.isArray(topLevelMeta.pages) || !topLevelMeta.pages.includes('guides')) {
  fail('content/docs/meta.json must include a first-class "guides" nav section.');
}

const guidesMetaPath = join(guidesRoot, 'meta.json');
if (!existsSync(guidesMetaPath)) {
  fail('content/docs/guides/meta.json is missing.');
}

const guidesMeta = readJson(guidesMetaPath);

if (guidesMeta.title !== 'Guides') {
  fail('content/docs/guides/meta.json must use title "Guides".');
}

if (guidesMeta.description !== 'Step-by-Step How-Tos') {
  fail('content/docs/guides/meta.json description must describe the step-by-step how-to section.');
}

const actualPages = Array.isArray(guidesMeta.pages) ? guidesMeta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/guides/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const sources = [];
for (const page of requiredPages) {
  const file = join(guidesRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing guides doc page: content/docs/guides/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  sources.push(source);

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/guides/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/guides/${page}.mdx is missing read_when frontmatter.`);
  }
}

const joined = sources.join('\n');
const missingMentions = requiredMentions.filter((mention) => !joined.includes(mention));
if (missingMentions.length > 0) {
  fail(`Guides docs are missing required mentions: ${missingMentions.join(', ')}.`);
}

if (!joined.includes('/docs/guide/getting-started') || !joined.includes('/docs/reference/troubleshooting')) {
  fail('Guides docs must cross-link the getting-started guide and the troubleshooting reference.');
}

if (!readFileSync(join(guidesRoot, 'install-and-first-run.mdx'), 'utf8').includes('/docs/cli/install-debugging')) {
  fail('install-and-first-run guide must link to the install debugging reference.');
}

if (!readFileSync(join(guidesRoot, 'connect-a-harness.mdx'), 'utf8').includes('/docs/harnesses/provider-auth')) {
  fail('connect-a-harness guide must link to the provider auth boundary.');
}

if (!readFileSync(join(guidesRoot, 'set-up-the-daemon.mdx'), 'utf8').includes('/docs/daemon/lifecycle')) {
  fail('set-up-the-daemon guide must link to the daemon lifecycle reference.');
}

if (!readFileSync(join(guidesRoot, 'set-up-memory.mdx'), 'utf8').includes('/docs/memory-models/memory')) {
  fail('set-up-memory guide must link to the memory model overview.');
}

if (!readFileSync(join(guidesRoot, 'fix-a-failed-install.mdx'), 'utf8').includes('/docs/cli/install-debugging')) {
  fail('fix-a-failed-install guide must link to the install debugging reference.');
}

if (!readFileSync(join(guidesRoot, 'upgrade-coven.mdx'), 'utf8').includes('/docs/daemon/recovery-upgrades')) {
  fail('upgrade-coven guide must link to the recovery and upgrades reference.');
}

if (!readFileSync(join(guidesRoot, 'script-the-api.mdx'), 'utf8').includes('/docs/reference/api')) {
  fail('script-the-api guide must link to the API reference.');
}

const scriptApiSource = readFileSync(join(guidesRoot, 'script-the-api.mdx'), 'utf8');
const apiRequestCount = (scriptApiSource.match(/<ApiRequest\b/g) ?? []).length;
if (apiRequestCount < 5) {
  fail(`script-the-api guide must wrap its five steps in <ApiRequest> blocks (found ${apiRequestCount}).`);
}
if (!scriptApiSource.includes('<ApiConsole />')) {
  fail('script-the-api guide must render the <ApiConsole /> dock.');
}
if (!scriptApiSource.includes("capture={{ SESSION_ID: 'id' }}")) {
  fail('script-the-api launch step must capture SESSION_ID.');
}
if (!scriptApiSource.includes("capture={{ AFTER_SEQ: 'nextCursor.afterSeq' }}")) {
  fail('script-the-api events step must capture AFTER_SEQ from the events cursor.');
}

console.log('Guides docs check passed.');
