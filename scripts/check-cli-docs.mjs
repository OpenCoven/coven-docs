import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const cliRoot = join(docsRoot, 'cli');
const guideRoot = join(docsRoot, 'guide');
const requiredGuideMetaPages = [
  'getting-started',
  'install',
  'platforms',
  'deployments',
  'concepts',
  'architecture',
];

const requiredPages = [
  'index',
  'install',
  'install-debugging',
  'interactive',
  'doctor',
  'daemon',
  'run',
  'sessions',
  'observe',
  'hub-scheduler',
  'engine-auth',
  'repo-workflow',
  'patch-openclaw',
  'pc',
  'uninstall',
];

const requiredGuidePages = ['install', 'platforms', 'deployments'];

const requiredInstallMentions = [
  'npm install -g @opencoven/cli',
  'cargo install --path crates/coven-cli',
  'Apple Silicon',
  'glibc',
  'PowerShell',
  'WSL2',
  'Linux filesystem',
  'launchd',
  'systemd',
  'Docker',
  'Podman',
  'Nix',
  'Raspberry Pi',
  'COVEN_HOME',
  'coven doctor',
  'coven daemon status',
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
  'coven chat',
  'coven status',
  'coven familiars',
  'coven skills',
  'coven memory',
  'coven research',
  'coven calls',
  'coven logs',
  'coven vacuum',
  'coven hub',
  'coven scheduler',
  'coven travel',
  'coven executor',
  'coven engine',
  'coven auth',
  'coven models',
  'coven acp',
  'coven code',
  'coven wt',
  'coven claim',
  'coven hooks',
  'coven ward',
  'coven adapter',
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

if (cliMeta.description !== 'Command-Line Reference') {
  fail('content/docs/cli/meta.json description must describe the command reference section.');
}

const actualPages = Array.isArray(cliMeta.pages) ? cliMeta.pages : [];
const missingPages = requiredPages.filter((page) => !actualPages.includes(page));
if (missingPages.length > 0) {
  fail(`content/docs/cli/meta.json is missing pages: ${missingPages.join(', ')}.`);
}

const guideMetaPath = join(guideRoot, 'meta.json');
if (!existsSync(guideMetaPath)) {
  fail('content/docs/guide/meta.json is missing.');
}

const guideMeta = readJson(guideMetaPath);
const actualGuidePages = Array.isArray(guideMeta.pages) ? guideMeta.pages : [];
if (JSON.stringify(actualGuidePages) !== JSON.stringify(requiredGuideMetaPages)) {
  fail(`content/docs/guide/meta.json pages must be exactly: ${requiredGuideMetaPages.join(', ')}.`);
}

const missingGuidePages = requiredGuidePages
  .map((page) => join(guideRoot, `${page}.mdx`))
  .filter((file) => !existsSync(file));
if (missingGuidePages.length > 0) {
  fail(`missing guide doc pages: ${missingGuidePages.map((file) => file.replace(`${root}/`, '')).join(', ')}.`);
}

const guideSource = [];
for (const page of requiredGuidePages) {
  const file = join(guideRoot, `${page}.mdx`);
  const source = readFileSync(file, 'utf8');
  guideSource.push(source);

  if (source.includes('Stub') || source.includes('fill in')) {
    fail(`content/docs/guide/${page}.mdx still contains stub text.`);
  }

  if (!source.includes('read_when:')) {
    fail(`content/docs/guide/${page}.mdx is missing read_when frontmatter.`);
  }
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

if (!joined.includes('/docs/daemon') || !joined.includes('/docs/cli/sessions')) {
  fail('CLI docs must cross-link daemon and session management docs.');
}

if (!readFileSync(join(cliRoot, 'daemon.mdx'), 'utf8').includes('/docs/daemon/lifecycle')) {
  fail('CLI daemon page must link to daemon lifecycle docs.');
}

if (!readFileSync(join(cliRoot, 'sessions.mdx'), 'utf8').includes('/docs/daemon/lifecycle')) {
  fail('CLI sessions page must link to daemon lifecycle docs.');
}

const joinedGuideSource = guideSource.join('\n');
const missingInstallMentions = requiredInstallMentions.filter((mention) => !joinedGuideSource.includes(mention));
if (missingInstallMentions.length > 0) {
  fail(`Guide install docs are missing required mentions: ${missingInstallMentions.join(', ')}.`);
}

console.log('CLI docs check passed.');
