import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectAnchors, stripCodeFences } from './mdx-anchors.mjs';

const root = resolve(import.meta.dirname, '..');
const docsOrigin = 'https://docs.opencoven.ai';
const shaPattern = /^[0-9a-f]{40}$/;
const namePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// These command references are more specific than the upstream landing pages.
const preferredIndexHrefs = {
  help: '/docs/cli#find-the-right-command',
  config: '/docs/cli#configuration-paths-reset-and-color',
  reset: '/docs/cli#configuration-paths-reset-and-color',
  completions: '/docs/cli#shell-completions',
  kill: '/docs/cli/sessions#kill',
  memory: '/docs/cli/observe#roster-skills-memory-research-calls',
};

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has unexpected fields`);
}

function text(value, label) {
  assert(typeof value === 'string' && value.trim() && !/[\u0000-\u001f\u007f]/.test(value), `${label} must be nonempty text without control characters`);
}

export function loadRepoCliHelpInputs() {
  const read = (file) => readFileSync(join(root, file), 'utf8');
  const json = (file) => JSON.parse(read(file));
  const docsRoot = join(root, 'content/docs');
  const routeIndex = new Map();
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && file.endsWith('.mdx')) {
        const slug = relative(docsRoot, file).replaceAll('\\', '/').replace(/\.mdx$/, '').replace(/(^|\/)index$/, '');
        routeIndex.set(`/docs/${slug}`.replace(/\/$/, ''), collectAnchors(readFileSync(file, 'utf8')));
      }
    }
  }
  walk(docsRoot);
  return {
    rawContract: read('content/data/coven-cli-help.json'),
    provenance: json('content/data/coven-cli-help.provenance.json'),
    sourceLock: json('docs/source-lock.json'),
    redirects: new Map(json('docs/site-manifest.json').redirects.map(({ source, destination }) => [source, destination])),
    routeIndex,
    cliIndexSource: read('content/docs/cli/index.mdx'),
  };
}

export function checkCliHelpContract({ rawContract, provenance, sourceLock, redirects, routeIndex, cliIndexSource } = loadRepoCliHelpInputs()) {
  const raw = rawContract.replace(/\r\n?/g, '\n');
  const contract = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(contract, null, 2)}\n`, 'CLI help snapshot must be deterministic pretty JSON with a trailing newline');
  assert.equal(createHash('sha256').update(raw).digest('hex'), provenance.capture.sha256, 'CLI help snapshot differs from the recorded capture');
  assert.equal(provenance.schemaVersion, 1, 'Unsupported provenance schema');
  assert.equal(provenance.capture.command, 'coven help --all --json', 'Unexpected capture command');
  assert.equal(provenance.capture.repeatOutputIdentical, true, 'Capture must be repeated to check determinism');
  assert(shaPattern.test(provenance.capture.sourceCommit), 'Capture requires a full source commit');
  text(provenance.capture.cliVersion, 'Captured CLI version');
  const source = sourceLock.sources.find(({ id }) => id === provenance.sourceId);
  assert(source && source.repo === 'OpenCoven/coven' && provenance.repo === source.repo, 'CLI help provenance must name the owning source');
  assert.equal(provenance.verifiedCommit, source.verifiedCommit, 'CLI help provenance must match the source-lock pin');
  assert(shaPattern.test(provenance.verifiedCommit), 'Provenance requires a full verified commit');
  const sourcePaths = ['crates/coven-cli/src/help.rs', 'crates/coven-cli/src/main.rs'];
  assert.deepEqual(provenance.sourceBlobs.map(({ path }) => path).sort(), sourcePaths, 'Record both CLI definition and help catalog blobs');
  for (const blob of provenance.sourceBlobs) {
    assert(source.paths.includes(blob.path), `${blob.path} must remain in the upstream freshness watch`);
    assert(shaPattern.test(blob.verifiedBlob) && blob.verifiedBlob === blob.capturedSourceBlob, `${blob.path} must match the captured CLI source`);
  }

  function internalHref(value) {
    const url = new URL(value, docsOrigin);
    assert(url.origin === docsOrigin && !url.username && !url.password && !url.search && url.pathname.startsWith('/docs/'), `Invalid docs destination: ${value}`);
    return `${url.pathname}${url.hash}`;
  }

  function resolveHref(value) {
    let href = internalHref(value);
    const seen = new Set();
    while (true) {
      const url = new URL(href, docsOrigin);
      const destination = redirects.get(url.pathname);
      if (!destination) return href;
      assert(!seen.has(url.pathname), `Redirect cycle at ${url.pathname}`);
      seen.add(url.pathname);
      const target = new URL(internalHref(destination), docsOrigin);
      if (!target.hash) target.hash = url.hash;
      href = `${target.pathname}${target.hash}`;
    }
  }

  function checkDestination(href, label) {
    const url = new URL(href, docsOrigin);
    const anchors = routeIndex.get(url.pathname);
    assert(anchors, `${label} points to missing route ${url.pathname}`);
    if (url.hash) assert(anchors.has(decodeURIComponent(url.hash.slice(1))), `${label} points to missing anchor ${href}`);
  }

  // Require each command's own command-map row, even when destinations are shared.
  const indexLinks = [...stripCodeFences(cliIndexSource).replace(/<!--[^]*?-->|\{\/\*[^]*?\*\/\}/g, '').matchAll(
    /^\|\s*\[`coven ([a-z0-9-]+)(?: [^`]+)?`\]\(([^)\s]+)\)\s*\|/gm,
  )].map(([, name, href]) => ({ name, href: resolveHref(href) }));
  exactKeys(contract, ['schemaVersion', 'groups'], 'Help contract');
  assert.equal(contract.schemaVersion, 1, 'Unsupported help schema');
  assert(Array.isArray(contract.groups) && contract.groups.length > 0, 'Help groups must be nonempty');
  const groups = new Set();
  const commands = new Set();
  for (const group of contract.groups) {
    exactKeys(group, ['id', 'title', 'commands'], 'Help group');
    assert(typeof group.id === 'string' && namePattern.test(group.id) && !groups.has(group.id), 'Invalid or duplicate help group');
    groups.add(group.id);
    text(group.title, `${group.id} title`);
    assert(Array.isArray(group.commands) && group.commands.length > 0, `${group.id} must contain commands`);
    for (const command of group.commands) {
      exactKeys(command, ['name', 'summary', 'docsUrl'], 'Help command');
      assert(typeof command.name === 'string' && namePattern.test(command.name) && !commands.has(command.name), 'Invalid or duplicate command');
      assert(!['process-supervisor', 'serve'].includes(command.name), `Hidden command leaked: ${command.name}`);
      commands.add(command.name);
      text(command.summary, `${command.name} summary`);
      assert(typeof command.docsUrl === 'string' && command.docsUrl.startsWith(`${docsOrigin}/docs/`), `${command.name} needs an absolute canonical docs URL`);
      const canonical = resolveHref(command.docsUrl);
      checkDestination(canonical, command.name);
      const preferred = resolveHref(preferredIndexHrefs[command.name] ?? canonical);
      checkDestination(preferred, `${command.name} index link`);
      assert(indexLinks.some(({ name, href }) => name === command.name && href === preferred), `CLI command map must link coven ${command.name} to ${preferred}`);
    }
  }
  assert.equal(groups.size, provenance.groupCount, 'Capture group count differs');
  assert.equal(commands.size, provenance.commandCount, 'Capture command count differs');
  return { groups: groups.size, commands: commands.size };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { groups, commands } = checkCliHelpContract();
    console.log(`CLI help contract check passed: ${commands} commands in ${groups} groups.`);
  } catch (error) {
    console.error(`CLI help contract check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
