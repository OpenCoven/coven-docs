// Coven's supported platforms, derived from upstream release metadata so the
// docs never invent a target. Upstream decides which binaries exist; the docs
// decide only how each platform is labelled and ordered.
//
// content/data/platforms.json is written by scripts/capture-platform-data.mjs
// and checked offline by scripts/check-platform-data.mjs.

import { stripCodeFences } from './mdx-anchors.mjs';

export const PLATFORM_DATA_PATH = 'content/data/platforms.json';
export const PLATFORM_SOURCE_ID = 'coven-runtime-contract';

// Upstream files the platform list is derived from. Each must stay in
// docs/source-lock.json so the drift gate flags any change to them.
export const PLATFORM_SOURCE_PATHS = [
  'crates/coven-cli/engine.lock',
  'npm/coven/bin/coven.js',
  'npm/coven/package.json',
  'scripts/publish-npm.mjs',
];

// Docs-owned labels, in display order. A platform upstream adds fails capture
// until it gets a label here.
export const PLATFORM_LABELS = {
  'macos-arm64': 'macOS (Apple Silicon)',
  'macos-x64': 'macOS (Intel)',
  'linux-x64': 'Linux (x64)',
  'linux-arm64': 'Linux (arm64)',
  'windows-x64': 'Windows (x64)',
};

const NODE_OS = { darwin: 'macos', linux: 'linux', win32: 'windows' };
const ENGINE_ARCH = { aarch64: 'arm64', x86_64: 'x64' };
const ARCHES = new Set(['arm64', 'x64']);
const shaPattern = /^[0-9a-f]{40}$/;

class PlatformSourceError extends Error {}

function sourceError(message) {
  return new PlatformSourceError(`Upstream platform sources disagree: ${message}`);
}

function sameSet(a, b) {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

function block(text, start, end, label) {
  const from = text.indexOf(start);
  const to = from === -1 ? -1 : text.indexOf(end, from + start.length);
  if (to === -1) throw sourceError(`could not find ${label}`);
  return text.slice(from + start.length, to);
}

/** `@opencoven/cli` optionalDependencies: the native packages npm may install. */
export function parseWrapperPackages(wrapperPackageJson) {
  const names = Object.keys(JSON.parse(wrapperPackageJson).optionalDependencies ?? {});
  if (names.length === 0) throw sourceError('npm/coven/package.json has no optionalDependencies');
  return new Set(names);
}

/** The launcher's `process.platform-process.arch` → native package map. */
export function parseLauncherPackages(launcherSource) {
  const body = block(launcherSource, 'const PLATFORM_PACKAGES = {', '}', 'PLATFORM_PACKAGES in npm/coven/bin/coven.js');
  const map = new Map();
  for (const [, nodeKey, packageName] of body.matchAll(/'([a-z0-9]+-[a-z0-9]+)':\s*'(@opencoven\/[a-z0-9-]+)'/g)) {
    map.set(nodeKey, packageName);
  }
  if (map.size === 0) throw sourceError('PLATFORM_PACKAGES in npm/coven/bin/coven.js is empty');
  return map;
}

/** Release targets in scripts/publish-npm.mjs: package, os, cpu, Rust target. */
export function parsePublishTargets(publishSource) {
  const body = block(publishSource, 'const targets = {', '\n};', 'targets in scripts/publish-npm.mjs');
  const field = (chunk, key) => chunk.match(new RegExp(`\\b${key}:\\s*'([^']+)'`))?.[1];
  const targets = body.split(/\bpackageName:\s*/).slice(1).map((chunk) => ({
    packageName: chunk.match(/^'([^']+)'/)?.[1],
    os: field(chunk, 'os'),
    cpu: field(chunk, 'cpu'),
    rustTarget: field(chunk, 'rustTarget'),
  }));
  if (targets.length === 0) throw sourceError('targets in scripts/publish-npm.mjs is empty');
  for (const target of targets) {
    if (!target.packageName || !target.os || !target.cpu || !target.rustTarget) {
      throw sourceError(`incomplete publish target ${JSON.stringify(target)}`);
    }
  }
  return targets;
}

/** Coven Code engine archives pinned in crates/coven-cli/engine.lock. */
export function parseEngineArchives(engineLock) {
  const archives = [...engineLock.matchAll(/^"(coven-code-([a-z]+)-([a-z0-9_]+)\.(?:tar\.gz|zip))"\s*=/gm)].map(
    ([, archive, os, arch]) => ({ archive, os, arch: ENGINE_ARCH[arch] ?? arch }),
  );
  if (archives.length === 0) throw sourceError('crates/coven-cli/engine.lock lists no engine archives');
  return archives;
}

/**
 * Derive the platform list from the four upstream files, cross-checking that
 * the wrapper, launcher, and release script agree on the native packages.
 */
export function derivePlatforms({ wrapperPackageJson, launcherSource, publishSource, engineLock }) {
  const wrapperPackages = parseWrapperPackages(wrapperPackageJson);
  const launcher = parseLauncherPackages(launcherSource);
  const targets = parsePublishTargets(publishSource);
  const archives = parseEngineArchives(engineLock);

  const published = new Set(targets.map(({ packageName }) => packageName));
  if (!sameSet(published, wrapperPackages)) {
    throw sourceError(`publish-npm builds [${[...published].sort()}] but the wrapper depends on [${[...wrapperPackages].sort()}]`);
  }
  if (!sameSet(new Set(launcher.values()), published)) {
    throw sourceError(`the launcher maps [${[...launcher.values()].sort()}] but publish-npm builds [${[...published].sort()}]`);
  }

  const platforms = new Map();
  const entry = (os, arch) => {
    const id = `${os}-${arch}`;
    if (!(id in PLATFORM_LABELS)) {
      throw new PlatformSourceError(`Upstream ships ${id}, which has no label. Add it to PLATFORM_LABELS in scripts/platform-data.mjs.`);
    }
    if (!platforms.has(id)) platforms.set(id, { id, os, arch, label: PLATFORM_LABELS[id], cli: null, covenCode: null });
    return platforms.get(id);
  };

  for (const target of targets) {
    const os = NODE_OS[target.os];
    if (!os || !ARCHES.has(target.cpu)) throw sourceError(`unknown publish target ${target.os}/${target.cpu}`);
    const node = `${target.os}-${target.cpu}`;
    if (launcher.get(node) !== target.packageName) {
      throw sourceError(`publish-npm builds ${target.packageName} for ${node} but the launcher resolves ${launcher.get(node) ?? 'nothing'}`);
    }
    entry(os, target.cpu).cli = { package: target.packageName, node, rustTarget: target.rustTarget };
  }

  for (const { archive, os, arch } of archives) {
    if (!Object.values(NODE_OS).includes(os) || !ARCHES.has(arch)) throw sourceError(`unknown engine archive ${archive}`);
    entry(os, arch).covenCode = { archive };
  }

  return Object.keys(PLATFORM_LABELS).filter((id) => platforms.has(id)).map((id) => platforms.get(id));
}

/** The committed data file: provenance plus platforms, as stable pretty JSON. */
export function serializePlatformData({ repo, verifiedCommit, sourceBlobs, platforms }) {
  const data = {
    schemaVersion: 1,
    provenance: {
      sourceId: PLATFORM_SOURCE_ID,
      repo,
      verifiedCommit,
      sourceBlobs: [...sourceBlobs].sort(
        (a, b) => PLATFORM_SOURCE_PATHS.indexOf(a.path) - PLATFORM_SOURCE_PATHS.indexOf(b.path),
      ),
    },
    platforms,
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

/**
 * Offline checks on the committed data: shape, docs-owned labels, and that
 * the provenance matches the source-lock pin. Returns failure messages.
 */
export function validatePlatformData(data, sourceLock) {
  const failures = [];
  const fail = (message) => failures.push(message);

  if (!exactKeys(data, ['schemaVersion', 'provenance', 'platforms']) || data.schemaVersion !== 1) {
    return ['platforms.json must be { schemaVersion: 1, provenance, platforms }'];
  }

  const { provenance } = data;
  if (!exactKeys(provenance, ['sourceId', 'repo', 'verifiedCommit', 'sourceBlobs'])) {
    fail('provenance must have exactly sourceId, repo, verifiedCommit, and sourceBlobs');
  } else {
    const source = sourceLock.sources?.find(({ id }) => id === provenance.sourceId);
    if (!source) {
      fail(`provenance names unknown source ${provenance.sourceId}`);
    } else {
      if (provenance.repo !== source.repo) fail(`provenance repo ${provenance.repo} must be ${source.repo}`);
      if (provenance.verifiedCommit !== source.verifiedCommit) {
        fail(
          `provenance is pinned to ${provenance.verifiedCommit} but docs/source-lock.json is at ${source.verifiedCommit}; ` +
            'run `node scripts/capture-platform-data.mjs --write` and review the diff',
        );
      }
      const paths = (provenance.sourceBlobs ?? []).map((blob) => blob?.path);
      if (JSON.stringify(paths) !== JSON.stringify(PLATFORM_SOURCE_PATHS)) {
        fail(`provenance must record blobs for exactly ${PLATFORM_SOURCE_PATHS.join(', ')} (sorted)`);
      }
      for (const blob of provenance.sourceBlobs ?? []) {
        if (!exactKeys(blob, ['path', 'blob']) || !shaPattern.test(blob.blob)) {
          fail(`provenance blob for ${blob?.path} must be { path, blob } with a full Git SHA`);
        }
        if (!source.paths.includes(blob?.path)) {
          fail(`${blob?.path} must stay in docs/source-lock.json paths so drift in it is caught`);
        }
      }
    }
  }

  if (!Array.isArray(data.platforms) || data.platforms.length === 0) {
    fail('platforms must be a non-empty array');
    return failures;
  }

  const ids = data.platforms.map((platform) => platform?.id);
  const order = Object.keys(PLATFORM_LABELS).filter((id) => ids.includes(id));
  if (new Set(ids).size !== ids.length) fail('platform ids must be unique');
  if (JSON.stringify(ids) !== JSON.stringify(order)) fail(`platforms must follow PLATFORM_LABELS order: ${order.join(', ')}`);

  for (const platform of data.platforms) {
    const label = platform?.id ?? '<missing id>';
    if (!exactKeys(platform, ['id', 'os', 'arch', 'label', 'cli', 'covenCode'])) {
      fail(`platform ${label} must have exactly id, os, arch, label, cli, and covenCode`);
      continue;
    }
    if (platform.id !== `${platform.os}-${platform.arch}`) fail(`platform ${label} id must be <os>-<arch>`);
    if (platform.label !== PLATFORM_LABELS[platform.id]) fail(`platform ${label} label must be ${PLATFORM_LABELS[platform.id]}`);
    if (platform.cli === null && platform.covenCode === null) fail(`platform ${label} ships neither the CLI nor Coven Code`);

    if (platform.cli !== null) {
      const nodeOs = Object.keys(NODE_OS).find((key) => NODE_OS[key] === platform.os);
      if (
        !exactKeys(platform.cli, ['package', 'node', 'rustTarget']) ||
        !/^@opencoven\/cli-[a-z0-9-]+$/.test(platform.cli.package) ||
        platform.cli.node !== `${nodeOs}-${platform.arch}` ||
        !/^[a-z0-9_]+-[a-z0-9_-]+$/.test(platform.cli.rustTarget)
      ) {
        fail(`platform ${label} cli must be { package, node: ${nodeOs}-${platform.arch}, rustTarget }`);
      }
    }

    if (platform.covenCode !== null) {
      const engineArch = Object.keys(ENGINE_ARCH).find((key) => ENGINE_ARCH[key] === platform.arch);
      const pattern = new RegExp(`^coven-code-${platform.os}-${engineArch}\\.(?:tar\\.gz|zip)$`);
      if (!exactKeys(platform.covenCode, ['archive']) || !pattern.test(platform.covenCode.archive)) {
        fail(`platform ${label} covenCode.archive must be coven-code-${platform.os}-${engineArch}.(tar.gz|zip)`);
      }
    }
  }

  return failures;
}

/** Tokens a <Platform only> attribute may use: each platform id and OS family. */
export function platformTokensFor(platforms) {
  return new Set(platforms.flatMap(({ id, os }) => [id, os]));
}

/**
 * Problems with <Platform> blocks in one MDX source: missing or unknown
 * tokens, self-closing or nested blocks, unbalanced tags, and headings inside
 * a block (a hidden heading would still sit in the table of contents).
 */
export function platformBlockProblems(source, knownTokens) {
  const problems = [];
  const text = stripCodeFences(source);
  const lineAt = (index) => text.slice(0, index).split('\n').length;
  let open = null;

  for (const match of text.matchAll(/<Platform\b([^>]*)>|<\/Platform\s*>/g)) {
    const line = lineAt(match.index);
    if (match[0].startsWith('</')) {
      if (!open) {
        problems.push(`line ${line}: </Platform> has no opening tag`);
        continue;
      }
      if (/^ {0,3}#{1,6}[ \t]/m.test(text.slice(open.end, match.index))) {
        problems.push(`line ${open.line}: <Platform> contains a heading; keep headings outside platform blocks`);
      }
      open = null;
      continue;
    }

    if (open) problems.push(`line ${line}: <Platform> is nested in the block opened on line ${open.line}`);
    const attributes = match[1];
    if (/\/\s*$/.test(attributes)) problems.push(`line ${line}: <Platform> must wrap content, not self-close`);
    const only = attributes.match(/\bonly="([^"]*)"/)?.[1];
    const tokens = (only ?? '').trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) problems.push(`line ${line}: <Platform> needs only="…" naming at least one platform`);
    for (const token of tokens) {
      if (!knownTokens.has(token)) problems.push(`line ${line}: unknown platform "${token}"`);
    }
    open = { line, end: match.index + match[0].length };
  }

  if (open) problems.push(`line ${open.line}: <Platform> is never closed`);
  return problems;
}
