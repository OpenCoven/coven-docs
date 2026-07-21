import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const guidesRoot = join(docsRoot, 'guides');

const requiredPages = ['index', 'install-and-first-run', 'connect-a-harness'];

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

console.log('Guides docs check passed.');
