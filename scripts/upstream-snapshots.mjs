// Byte-for-byte copies of upstream contract artifacts that docs pages render
// from, so a table or diagram is generated from the pinned source instead of
// being retyped from it.
//
// content/data/upstream/snapshots.json records each copy's upstream path and
// Git blob at the docs/source-lock.json pin. scripts/capture-upstream-snapshots.mjs
// writes the copies (it needs the network); scripts/check-upstream-snapshots.mjs
// checks them offline by hashing each local file the way Git does.

import { createHash } from 'node:crypto';
import { VECTOR_SUITES } from '../lib/automation-vectors.mjs';
import { CONFORMANCE_FILES } from '../lib/automation-conformance.mjs';

export const SNAPSHOTS_PATH = 'content/data/upstream/snapshots.json';
export const SNAPSHOT_SOURCE_ID = 'coven-runtime-contract';

// Upstream path → local copy. Each upstream path must stay in
// docs/source-lock.json so the drift gate flags any change to it.
export const SNAPSHOT_FILES = [
  {
    path: 'spec/coven-automations/v1/state-machines.json',
    local: 'content/data/upstream/coven-automations-v1/state-machines.json',
  },
  // Conformance vectors that upstream CI executes against the daemon's
  // scheduling code; the scheduling page renders its edge cases from them.
  ...VECTOR_SUITES.map((suite) => ({
    path: `conformance/automations/runner/${suite}.vectors.json`,
    local: `content/data/upstream/coven-automations-conformance/${suite}.vectors.json`,
  })),
  // The conformance page's profiles, release states and pinned inputs.
  ...Object.values(CONFORMANCE_FILES),
];

const shaPattern = /^[0-9a-f]{40}$/;

/** The id Git gives these bytes as a blob: SHA-1 over "blob <size>\0<bytes>". */
export function gitBlobSha(bytes) {
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

export function serializeSnapshots({ repo, verifiedCommit, blobs }) {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      sourceId: SNAPSHOT_SOURCE_ID,
      repo,
      verifiedCommit,
      files: SNAPSHOT_FILES.map(({ path, local }) => ({ path, local, blob: blobs[path] })),
    },
    null,
    2,
  )}\n`;
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
 * Problems with the snapshot manifest and the local copies it names.
 * `readLocal(path)` returns a file's bytes, or null when it is missing.
 */
export function snapshotProblems(manifest, sourceLock, readLocal) {
  const problems = [];
  const fail = (message) => problems.push(message);
  const recapture = 'run `pnpm capture:upstream-snapshots` and review the diff';

  if (!exactKeys(manifest, ['schemaVersion', 'sourceId', 'repo', 'verifiedCommit', 'files']) || manifest.schemaVersion !== 1) {
    return [`${SNAPSHOTS_PATH} must be { schemaVersion: 1, sourceId, repo, verifiedCommit, files }`];
  }
  const source = sourceLock.sources?.find(({ id }) => id === manifest.sourceId);
  if (manifest.sourceId !== SNAPSHOT_SOURCE_ID || !source) {
    return [`${SNAPSHOTS_PATH} must name the ${SNAPSHOT_SOURCE_ID} source in docs/source-lock.json`];
  }
  if (manifest.repo !== source.repo) fail(`${SNAPSHOTS_PATH} repo ${manifest.repo} must be ${source.repo}`);
  if (manifest.verifiedCommit !== source.verifiedCommit) {
    fail(`${SNAPSHOTS_PATH} is pinned to ${manifest.verifiedCommit} but docs/source-lock.json is at ${source.verifiedCommit}; ${recapture}`);
  }

  const expected = SNAPSHOT_FILES.map(({ path, local }) => `${path} -> ${local}`);
  const recorded = (Array.isArray(manifest.files) ? manifest.files : []).map((file) => `${file?.path} -> ${file?.local}`);
  if (JSON.stringify(recorded) !== JSON.stringify(expected)) {
    fail(`${SNAPSHOTS_PATH} must list exactly ${expected.join(', ')}; ${recapture}`);
    return problems;
  }

  for (const file of manifest.files) {
    if (!exactKeys(file, ['path', 'local', 'blob']) || !shaPattern.test(file.blob)) {
      fail(`${SNAPSHOTS_PATH} entry for ${file.path} must be { path, local, blob } with a full Git SHA`);
      continue;
    }
    if (!source.paths.includes(file.path)) {
      fail(`${file.path} must stay in docs/source-lock.json paths so drift in it is caught`);
    }
    const bytes = readLocal(file.local);
    if (bytes === null) {
      fail(`${file.local} is missing; ${recapture}`);
    } else if (gitBlobSha(bytes) !== file.blob) {
      fail(`${file.local} is not upstream blob ${file.blob} of ${file.path}; restore it with \`pnpm capture:upstream-snapshots\` instead of editing it`);
    }
  }
  return problems;
}
