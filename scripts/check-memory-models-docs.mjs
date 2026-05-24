import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const sectionRoot = join(docsRoot, 'memory-models');

const requiredPages = [
  'index',
  'memory',
  'working-memory',
  'persistent-memory',
  'episodic-memory',
  'semantic-memory',
  'memory-search',
  'models',
  'provider-boundary',
  'openai',
  'anthropic',
  'local-models',
];

const requiredMentions = [
  'Working memory',
  'Persistent memory',
  'Episodic memory',
  'Semantic memory',
  'Memory search',
  'session ledger',
  'event log',
  'provider credentials',
  'Codex',
  'Claude Code',
  'OpenAI',
  'Anthropic',
  'local models',
];

function fail(message) {
  console.error(`Memory + Models docs check failed: ${message}`);
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

if (!Array.isArray(topLevelMeta.pages) || !topLevelMeta.pages.includes('memory-models')) {
  fail('content/docs/meta.json must include a first-class "memory-models" nav section.');
}

const metaPath = join(sectionRoot, 'meta.json');
if (!existsSync(metaPath)) {
  fail('content/docs/memory-models/meta.json is missing.');
}

const meta = readJson(metaPath);

if (meta.title !== 'Memory + Models') {
  fail('content/docs/memory-models/meta.json must use title "Memory + Models".');
}

if (meta.description !== 'Memory layers, search, provider boundaries, and model access for persistent familiars.') {
  fail('content/docs/memory-models/meta.json description must describe the memory and models section.');
}

const actualPages = Array.isArray(meta.pages) ? meta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/memory-models/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const sources = [];
for (const page of requiredPages) {
  const file = join(sectionRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing Memory + Models doc page: content/docs/memory-models/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  sources.push(source);

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/memory-models/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/memory-models/${page}.mdx is missing read_when frontmatter.`);
  }
}

const joined = sources.join('\n');
const missingMentions = requiredMentions.filter((mention) => !joined.includes(mention));
if (missingMentions.length > 0) {
  fail(`Memory + Models docs are missing required mentions: ${missingMentions.join(', ')}.`);
}

if (!joined.includes('/docs/familiars/sessions') || !joined.includes('/docs/harnesses/provider-auth')) {
  fail('Memory + Models docs must cross-link session lifecycle and harness provider-auth docs.');
}

if (!readFileSync(join(sectionRoot, 'models.mdx'), 'utf8').includes('/docs/harnesses/codex')) {
  fail('models page must link to the Codex harness page.');
}

if (!readFileSync(join(sectionRoot, 'provider-boundary.mdx'), 'utf8').includes('/docs/reference/auth')) {
  fail('provider-boundary page must link to the authentication reference.');
}

console.log('Memory + Models docs check passed.');
