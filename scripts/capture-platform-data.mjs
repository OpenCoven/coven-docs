// Re-derive content/data/platforms.json from upstream at the source-lock pin.
//
//   node scripts/capture-platform-data.mjs          # fail if the committed file is stale
//   node scripts/capture-platform-data.mjs --write  # rewrite it
//
// Reads the pinned files through the GitHub API (OpenCoven/coven is public;
// GITHUB_TOKEN raises the rate limit). Run --write whenever the source lock
// advances, and review the diff like any other upstream change.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import {
  PLATFORM_DATA_PATH,
  PLATFORM_SOURCE_ID,
  PLATFORM_SOURCE_PATHS,
  derivePlatforms,
  serializePlatformData,
} from './platform-data.mjs';

const root = resolve(import.meta.dirname, '..');
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const token = process.env.GITHUB_TOKEN?.trim();
const write = process.argv.includes('--write');

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'coven-docs-platform-data/1',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function readPinnedFile(repo, commit, path) {
  const url = new URL(`/repos/${repo}/contents/${path}`, apiBase);
  url.searchParams.set('ref', commit);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}@${commit}`);
  const file = await response.json();
  if (file.type !== 'file' || file.encoding !== 'base64' || !/^[0-9a-f]{40}$/.test(file.sha ?? '')) {
    throw new Error(`${path}@${commit} is not a readable file`);
  }
  return { blob: file.sha, text: Buffer.from(file.content, 'base64').toString('utf8') };
}

const sourceLock = JSON.parse(await readFile(resolve(root, 'docs/source-lock.json'), 'utf8'));
const source = sourceLock.sources.find(({ id }) => id === PLATFORM_SOURCE_ID);
if (!source) throw new Error(`docs/source-lock.json has no ${PLATFORM_SOURCE_ID} source`);

const files = Object.fromEntries(
  await Promise.all(
    PLATFORM_SOURCE_PATHS.map(async (path) => [path, await readPinnedFile(source.repo, source.verifiedCommit, path)]),
  ),
);

const platforms = derivePlatforms({
  wrapperPackageJson: files['npm/coven/package.json'].text,
  launcherSource: files['npm/coven/bin/coven.js'].text,
  publishSource: files['scripts/publish-npm.mjs'].text,
  engineLock: files['crates/coven-cli/engine.lock'].text,
});

const next = serializePlatformData({
  repo: source.repo,
  verifiedCommit: source.verifiedCommit,
  sourceBlobs: PLATFORM_SOURCE_PATHS.map((path) => ({ path, blob: files[path].blob })),
  platforms,
});

const dataPath = resolve(root, PLATFORM_DATA_PATH);
if (write) {
  await writeFile(dataPath, next, 'utf8');
  console.log(`Wrote ${PLATFORM_DATA_PATH}: ${platforms.map(({ id }) => id).join(', ')} at ${source.verifiedCommit.slice(0, 7)}.`);
} else {
  const current = await readFile(dataPath, 'utf8').catch(() => '');
  if (current !== next) {
    console.error(
      `${PLATFORM_DATA_PATH} does not match upstream ${source.repo}@${source.verifiedCommit.slice(0, 7)}. ` +
        'Run `node scripts/capture-platform-data.mjs --write` and review the diff.',
    );
    process.exit(1);
  }
  console.log(`Platform data matches upstream ${source.repo}@${source.verifiedCommit.slice(0, 7)} (${platforms.length} platforms).`);
}
