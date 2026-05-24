import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const cliRoot = join(docsRoot, 'cli');

const requiredPages = [
  'index',
  'install',
  'interactive',
  'doctor',
  'daemon',
  'run',
  'sessions',
  'patch-openclaw',
  'pc',
];

const requiredCommandMentions = [
  'coven',
  'coven tui',
  'coven doctor',
  'coven daemon start',
  'coven daemon status',
  'coven daemon restart',
  'coven daemon stop',
  'coven run codex',
  'coven run claude',
  'coven sessions',
  'coven sessions --all',
  'coven sessions --manage',
  'coven sessions --plain',
  'coven sessions --json',
  'coven attach',
  'coven summon',
  'coven archive',
  'coven sacrifice',
  'coven patch openclaw',
  'coven pc',
];

function fail(message) {
  console.error(`CLI docs check failed: ${message}`);
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

if (!Array.isArray(topLevelMeta.pages) || !topLevelMeta.pages.includes('cli')) {
  fail('content/docs/meta.json must include a first-class "cli" nav section.');
}

const cliMetaPath = join(cliRoot, 'meta.json');
if (!existsSync(cliMetaPath)) {
  fail('content/docs/cli/meta.json is missing.');
}

const cliMeta = readJson(cliMetaPath);

if (cliMeta.title !== 'CLI Reference') {
  fail('content/docs/cli/meta.json must use title "CLI Reference".');
}

if (cliMeta.description !== 'Install, inspect, run, recover, and automate Coven from the coven command.') {
  fail('content/docs/cli/meta.json description must describe the command reference section.');
}

const actualPages = Array.isArray(cliMeta.pages) ? cliMeta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/cli/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const allSource = [];

for (const page of requiredPages) {
  const file = join(cliRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing CLI doc page: content/docs/cli/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  allSource.push(source);

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/cli/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/cli/${page}.mdx is missing read_when frontmatter.`);
  }
}

const joined = allSource.join('\n');
const missingCommands = requiredCommandMentions.filter((command) => !joined.includes(command));
if (missingCommands.length > 0) {
  fail(`CLI docs are missing command mentions: ${missingCommands.join(', ')}.`);
}

if (!joined.includes('/docs/daemon') || !joined.includes('/docs/familiars/sessions')) {
  fail('CLI docs must cross-link daemon and session lifecycle docs.');
}

if (!readFileSync(join(cliRoot, 'daemon.mdx'), 'utf8').includes('/docs/daemon/lifecycle')) {
  fail('CLI daemon page must link to daemon lifecycle docs.');
}

if (!readFileSync(join(cliRoot, 'sessions.mdx'), 'utf8').includes('/docs/familiars/sessions')) {
  fail('CLI sessions page must link to session lifecycle docs.');
}

console.log('CLI docs check passed.');
