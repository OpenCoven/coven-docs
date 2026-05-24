import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const harnessRoot = join(docsRoot, 'harnesses');

const requiredPages = [
  'index',
  'what-is-a-harness',
  'installing',
  'provider-auth',
  'project-roots',
  'working-directories',
  'codex',
  'claude-code',
  'custom-adapters',
  'troubleshooting',
];

const requiredMentions = [
  'Harness id',
  'codex',
  'claude',
  'coven run codex',
  'coven run claude',
  'coven doctor',
  'codex login',
  'claude doctor',
  'Provider credentials',
  'project root',
  'working directory',
  'PTY',
  'adapter',
];

function fail(message) {
  console.error(`Harness docs check failed: ${message}`);
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

if (!Array.isArray(topLevelMeta.pages) || !topLevelMeta.pages.includes('harnesses')) {
  fail('content/docs/meta.json must include a first-class "harnesses" nav section.');
}

const harnessMetaPath = join(harnessRoot, 'meta.json');
if (!existsSync(harnessMetaPath)) {
  fail('content/docs/harnesses/meta.json is missing.');
}

const harnessMeta = readJson(harnessMetaPath);

if (harnessMeta.title !== 'Harnesses') {
  fail('content/docs/harnesses/meta.json must use title "Harnesses".');
}

if (harnessMeta.description !== 'Deep dives for Codex, Claude Code, provider auth, project roots, working directories, and adapter boundaries.') {
  fail('content/docs/harnesses/meta.json description must describe the harness deep-dive section.');
}

const actualPages = Array.isArray(harnessMeta.pages) ? harnessMeta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/harnesses/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const sources = [];
for (const page of requiredPages) {
  const file = join(harnessRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing harness doc page: content/docs/harnesses/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  sources.push(source);

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/harnesses/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/harnesses/${page}.mdx is missing read_when frontmatter.`);
  }
}

const joined = sources.join('\n');
const missingMentions = requiredMentions.filter((mention) => !joined.includes(mention));
if (missingMentions.length > 0) {
  fail(`Harness docs are missing required mentions: ${missingMentions.join(', ')}.`);
}

if (!joined.includes('/docs/cli/run') || !joined.includes('/docs/daemon/security')) {
  fail('Harness docs must cross-link CLI run and daemon security docs.');
}

if (!readFileSync(join(harnessRoot, 'provider-auth.mdx'), 'utf8').includes('/docs/reference/auth')) {
  fail('provider-auth page must link to the authentication reference.');
}

if (!readFileSync(join(harnessRoot, 'troubleshooting.mdx'), 'utf8').includes('/docs/cli/doctor')) {
  fail('troubleshooting page must link to CLI doctor docs.');
}

console.log('Harness docs check passed.');
