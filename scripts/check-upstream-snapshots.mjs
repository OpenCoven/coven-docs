// Offline check for content/data/upstream/: every copy is the exact upstream
// blob its manifest records, at the docs/source-lock.json pin. Fetching
// upstream is scripts/capture-upstream-snapshots.mjs's job.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SNAPSHOTS_PATH, snapshotProblems } from './upstream-snapshots.mjs';
import { stateMachineProblems } from '../lib/automation-state-machines.mjs';
import { vectorProblems } from '../lib/automation-vectors.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const readLocal = (path) => {
  try {
    return readFileSync(resolve(root, path));
  } catch {
    return null;
  }
};

const manifest = JSON.parse(read(SNAPSHOTS_PATH));
const problems = snapshotProblems(manifest, JSON.parse(read('docs/source-lock.json')), readLocal);

// The pages render these files, so a shape they cannot render fails here
// rather than at build time.
if (problems.length === 0) {
  for (const { path, local } of manifest.files) {
    const doc = JSON.parse(read(local));
    const found = path.endsWith('/state-machines.json')
      ? stateMachineProblems(doc)
      : path.endsWith('.vectors.json')
        ? vectorProblems(path.split('/').pop().replace(/\.vectors\.json$/, ''), doc)
        : [`no page renders ${path}; add a validator for it`];
    problems.push(...found.map((problem) => `${local}: ${problem}`));
  }
}

if (problems.length > 0) {
  console.error(`Upstream snapshot check failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`Upstream snapshot check passed for ${manifest.files.length} file(s) at ${manifest.verifiedCommit.slice(0, 7)}.`);
