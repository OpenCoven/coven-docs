import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const covenCodeRoot = join(docsRoot, 'coven-code');
const staleCovenCodesRoot = join(docsRoot, 'coven-codes');

const requiredPages = [
  'index',
  'install',
  'providers',
  'commands',
  'configuration',
  'troubleshooting',
  'uninstall',
];

const requiredMentions = [
  'Coven Code',
  'coven-code',
  '@opencoven/coven-code',
  '@opencoven/cli',
  'coven tui',
  '/connect',
  '/model',
  '/coven',
  '/rewind',
  '/permissions',
  '/familiar',
  '/sandbox',
  '/review security',
  '/login switch',
  '/usage',
  '--permission-mode',
  '--dangerously-skip-permissions',
  '--output-format',
  '--auto-commits',
  '--bare',
  'Anthropic',
  'Codex',
  'Claude CLI import',
  'COVEN_CODE_PROVIDER',
  'COVEN_CODE_API_BASE',
  'OPENAI_API_KEY',
  'ANTHROPIC_BASE_URL',
  'OPENAI_BASE_URL',
  'autoCompact',
  'fileInjectionMaxSize',
  'claurst',
  '~/.coven-code',
  '~/.coven',
  'coven daemon status',
  'OpenCoven/coven-code',
];

function fail(message) {
  console.error(`Coven Code docs check failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read JSON at ${path}: ${error.message}`);
  }
}

if (existsSync(staleCovenCodesRoot)) {
  fail('stale content/docs/coven-codes directory still exists; use content/docs/coven-code.');
}

const topLevelMeta = readJson(join(docsRoot, 'meta.json'));
const topLevelPages = Array.isArray(topLevelMeta.pages) ? topLevelMeta.pages : [];

if (!topLevelPages.includes('coven-code')) {
  fail('content/docs/meta.json must include a first-class "coven-code" nav section.');
}

if (topLevelPages.includes('coven-codes')) {
  fail('content/docs/meta.json must not reference stale "coven-codes".');
}

const metaPath = join(covenCodeRoot, 'meta.json');
if (!existsSync(metaPath)) {
  fail('content/docs/coven-code/meta.json is missing.');
}

const meta = readJson(metaPath);
if (meta.title !== 'Coven Code') {
  fail('content/docs/coven-code/meta.json must use title "Coven Code".');
}

if (meta.description !== 'Agentic Coding TUI') {
  fail('content/docs/coven-code/meta.json description must describe the TUI section.');
}

const actualPages = Array.isArray(meta.pages) ? meta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/coven-code/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const sources = [];
for (const page of requiredPages) {
  const file = join(covenCodeRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing Coven Code doc page: content/docs/coven-code/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  sources.push(source);

  if (source.includes('Coven Codes') || source.includes('coven-codes')) {
    fail(`content/docs/coven-code/${page}.mdx still references stale Coven Codes naming.`);
  }

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/coven-code/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/coven-code/${page}.mdx is missing read_when frontmatter.`);
  }
}

const joined = sources.join('\n');
const missingMentions = requiredMentions.filter((mention) => !joined.includes(mention));
if (missingMentions.length > 0) {
  fail(`Coven Code docs are missing required mentions: ${missingMentions.join(', ')}.`);
}

if (!joined.includes('/docs/cli') || !joined.includes('/docs/harnesses') || !joined.includes('/docs/daemon')) {
  fail('Coven Code docs must cross-link CLI, harness, and daemon docs.');
}

console.log('Coven Code docs check passed.');
