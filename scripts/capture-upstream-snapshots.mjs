// Re-copy the upstream contract artifacts in content/data/upstream/ from the
// source-lock pin.
//
//   node scripts/capture-upstream-snapshots.mjs          # fail if a copy is stale
//   node scripts/capture-upstream-snapshots.mjs --write  # rewrite them
//
// Reads the pinned files through the GitHub API (OpenCoven/coven is public;
// GITHUB_TOKEN raises the rate limit). Run --write whenever the source lock
// advances, and review the diff like any other upstream change.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { SNAPSHOTS_PATH, SNAPSHOT_FILES, SNAPSHOT_SOURCE_ID, gitBlobSha, serializeSnapshots } from './upstream-snapshots.mjs';

const root = resolve(import.meta.dirname, '..');
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const token = process.env.GITHUB_TOKEN?.trim();
const write = process.argv.includes('--write');

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'coven-docs-upstream-snapshots/1',
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
  const bytes = Buffer.from(file.content, 'base64');
  if (gitBlobSha(bytes) !== file.sha) throw new Error(`${path}@${commit} did not decode to blob ${file.sha}`);
  return { blob: file.sha, bytes };
}

const sourceLock = JSON.parse(await readFile(resolve(root, 'docs/source-lock.json'), 'utf8'));
const source = sourceLock.sources.find(({ id }) => id === SNAPSHOT_SOURCE_ID);
if (!source) throw new Error(`docs/source-lock.json has no ${SNAPSHOT_SOURCE_ID} source`);

const files = await Promise.all(
  SNAPSHOT_FILES.map(async (file) => ({ ...file, ...(await readPinnedFile(source.repo, source.verifiedCommit, file.path)) })),
);
const manifest = serializeSnapshots({
  repo: source.repo,
  verifiedCommit: source.verifiedCommit,
  blobs: Object.fromEntries(files.map(({ path, blob }) => [path, blob])),
});

const at = `${source.repo}@${source.verifiedCommit.slice(0, 7)}`;
if (write) {
  for (const { local, bytes } of files) {
    await mkdir(dirname(resolve(root, local)), { recursive: true });
    await writeFile(resolve(root, local), bytes);
  }
  await writeFile(resolve(root, SNAPSHOTS_PATH), manifest, 'utf8');
  console.log(`Wrote ${files.length} upstream snapshot(s) from ${at}: ${files.map(({ path }) => path).join(', ')}.`);
} else {
  const stale = [];
  if ((await readFile(resolve(root, SNAPSHOTS_PATH), 'utf8').catch(() => '')) !== manifest) stale.push(SNAPSHOTS_PATH);
  for (const { local, bytes } of files) {
    const current = await readFile(resolve(root, local)).catch(() => null);
    if (current === null || !current.equals(bytes)) stale.push(local);
  }
  if (stale.length > 0) {
    console.error(`${stale.join(', ')} ${stale.length === 1 ? 'does' : 'do'} not match upstream ${at}. Run \`pnpm capture:upstream-snapshots\` and review the diff.`);
    process.exit(1);
  }
  console.log(`Upstream snapshots match ${at} (${files.length} file(s)).`);
}
