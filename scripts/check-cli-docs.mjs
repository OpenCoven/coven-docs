import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const cliRoot = join(docsRoot, 'cli');
const guideRoot = join(docsRoot, 'guide');

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

const requiredGuidePages = ['getting-started', 'install', 'platforms', 'deployments'];

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

const requiredGettingStartedMentions = [
  'coven doctor',
  'coven daemon start',
  'coven run codex "explain this repo in 5 bullets"',
  'coven sessions',
];

const requiredInteractiveMentions = ['coven-code', 'COVEN_LEGACY_TUI=1'];

const requiredInstallDebuggingMentions = [
  'npm view @opencoven/cli version',
  'which -a coven',
  'Get-Command -All coven',
  'rustup update stable',
];

const requiredUninstallMentions = ['coven daemon stop', 'cargo uninstall coven-cli'];

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

const requiredCanonicalPlatformMentions = [
  {
    file: join(cliRoot, 'install.mdx'),
    label: 'content/docs/cli/install.mdx',
    mentions: ['macOS Apple Silicon / arm64', 'macOS Intel / x64', 'darwin-x64'],
  },
  {
    file: join(guideRoot, 'platforms.mdx'),
    label: 'content/docs/guide/platforms.mdx',
    mentions: ['macOS Intel', 'darwin-x64'],
  },
  {
    file: join(cliRoot, 'install-debugging.mdx'),
    label: 'content/docs/cli/install-debugging.mdx',
    mentions: ['@opencoven/cli-macos-x64', 'darwin-x64'],
  },
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

function getOpeningFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== '---') {
    return null;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      return lines.slice(1, index).join('\n');
    }
  }

  return null;
}

function hasReadWhenFrontmatter(source) {
  const frontmatter = getOpeningFrontmatter(source);
  if (frontmatter === null) {
    return false;
  }

  const lines = frontmatter.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^read_when:\s*(.*)$/);
    if (!match) {
      continue;
    }

    if (match[1].trim().length > 0) {
      return true;
    }

    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next];
      if (nextLine.trim() === '') {
        continue;
      }

      if (/^[^\s]/.test(nextLine)) {
        return false;
      }

      return /^\s*-\s+/.test(nextLine);
    }

    return false;
  }

  return false;
}

const stubMarkerSamples = [
  ['Stub', true],
  ['Stub -- fill in', true],
  ['Stub — fill in later.', true],
  ['fill in', true],
  ['fill in later.', true],
  ['This line mentions fill in as ordinary prose.', false],
  ['The author asked us to fill in the blanks here.', false],
];

const stubMarkerRe = /^\s*(?:stub(?:\s*(?:--|—)\s*fill in(?:[\s:;,.!?-].*)?)?|fill in(?:[\s:;,.!?-].*)?)\s*$/i;

for (const [sample, expected] of stubMarkerSamples) {
  if (stubMarkerRe.test(sample) !== expected) {
    fail(`internal stub marker self-check failed for: ${sample}`);
  }
}

function hasStubMarker(source) {
  return source
    .split(/\r?\n/)
    .some((line) => stubMarkerRe.test(line));
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
const missingGuideNavPages = requiredGuidePages.filter(
  (page) => !actualGuidePages.includes(page),
);
if (missingGuideNavPages.length > 0) {
  fail(
    `content/docs/guide/meta.json is missing CLI onboarding dependencies: ${missingGuideNavPages.join(', ')}.`,
  );
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

  if (hasStubMarker(source)) {
    fail(`content/docs/guide/${page}.mdx still contains stub text.`);
  }

  if (!hasReadWhenFrontmatter(source)) {
    fail(`content/docs/guide/${page}.mdx is missing read_when frontmatter.`);
  }
}

const gettingStartedSource = readFileSync(join(guideRoot, 'getting-started.mdx'), 'utf8');
const missingGettingStartedMentions = requiredGettingStartedMentions.filter(
  (mention) => !gettingStartedSource.includes(mention),
);
if (missingGettingStartedMentions.length > 0) {
  fail(
    `content/docs/guide/getting-started.mdx is missing required onboarding mentions: ${missingGettingStartedMentions.join(', ')}.`,
  );
}

const allSource = [];

const interactiveSource = readFileSync(join(cliRoot, 'interactive.mdx'), 'utf8');
const missingInteractiveMentions = requiredInteractiveMentions.filter(
  (mention) => !interactiveSource.includes(mention),
);
if (missingInteractiveMentions.length > 0) {
  fail(
    `content/docs/cli/interactive.mdx is missing required interactive mentions: ${missingInteractiveMentions.join(', ')}.`,
  );
}

const installDebuggingSource = readFileSync(join(cliRoot, 'install-debugging.mdx'), 'utf8');
const missingInstallDebuggingMentions = requiredInstallDebuggingMentions.filter(
  (mention) => !installDebuggingSource.includes(mention),
);
if (missingInstallDebuggingMentions.length > 0) {
  fail(
    `content/docs/cli/install-debugging.mdx is missing required install-debugging mentions: ${missingInstallDebuggingMentions.join(', ')}.`,
  );
}

const uninstallSource = readFileSync(join(cliRoot, 'uninstall.mdx'), 'utf8');
const missingUninstallMentions = requiredUninstallMentions.filter(
  (mention) => !uninstallSource.includes(mention),
);
if (missingUninstallMentions.length > 0) {
  fail(
    `content/docs/cli/uninstall.mdx is missing required uninstall mentions: ${missingUninstallMentions.join(', ')}.`,
  );
}

for (const page of requiredPages) {
  const file = join(cliRoot, `${page}.mdx`);
  if (!existsSync(file)) {
    fail(`missing CLI doc page: content/docs/cli/${page}.mdx.`);
  }

  const source = readFileSync(file, 'utf8');
  allSource.push(source);

  if (hasStubMarker(source)) {
    fail(`content/docs/cli/${page}.mdx still contains stub text.`);
  }

  if (!hasReadWhenFrontmatter(source)) {
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

for (const requirement of requiredCanonicalPlatformMentions) {
  const source = readFileSync(requirement.file, 'utf8');
  const missing = requirement.mentions.filter((mention) => !source.includes(mention));
  if (missing.length > 0) {
    fail(`${requirement.label} is missing required canonical platform mentions: ${missing.join(', ')}.`);
  }
}

console.log('CLI docs check passed.');
